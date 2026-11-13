#!/usr/bin/env python3
"""Experimental CUDA-parallel ABSTRACT economic self-play for Hex Settlers.

This is NOT the full Hex Settlers rules engine. It models dice production, building
resources, roads, ships, simplified fog expansion, development cards and 2-point
titles on GPU tensors; it does not model true hex geometry, legal trades, robber
placement, ports, complete decks, fog tile placement or scenario-specific boards.
Its results MUST NOT be counted as authoritative training matches. Trained
weights are written to a separate candidate file, never overwriting the main model.
"""
import argparse
import json
import math
import os
import pathlib
import signal
import sys
import tempfile
import time


def atomic_json(filename, payload):
    path = pathlib.Path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.arena-', suffix='.json', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as dest:
            json.dump(payload, dest, indent=2, allow_nan=False)
            dest.flush()
            os.fsync(dest.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def model_features(torch, vp, resource, settlements, cities, roads, ships, army, target, round_number, income, dev_vp):
    # Only the unambiguous feature subset is precisely reconstructible in this
    # abstraction. All other features are APPROXIMATIONS, never real board data.
    n, players = vp.shape
    hand = resource.sum(-1)
    city_need = (torch.tensor([0,0,0,2,3],device=vp.device) - resource).clamp(min=0).sum(-1)
    settle_need = (torch.tensor([1,1,1,1,0],device=vp.device) - resource).clamp(min=0).sum(-1)
    dev_need = (torch.tensor([0,0,1,1,1],device=vp.device) - resource).clamp(min=0).sum(-1)
    progress = vp.float() / target
    max_other = torch.stack([torch.cat((progress[:,:i],progress[:,i+1:]),dim=1).amax(1) for i in range(players)],dim=1)
    mean_other = (progress.sum(1,keepdim=True) - progress) / (players-1)
    max_income = torch.stack([torch.cat((income[:,:i,:],income[:,i+1:,:]),dim=1).sum(-1).amax(1) for i in range(players)],dim=1)
    zeros = torch.zeros_like(progress)
    one = torch.ones_like(progress)
    return torch.stack([
        progress, zeros, (progress * math.exp(-round_number/max(8,target*2.5))).clamp(max=1),
        ((vp.float()-6)/target).clamp(min=0), (hand/12).clamp(max=1),
        one-(city_need.float()/5).clamp(max=1), one-(settle_need.float()/4).clamp(max=1),
        one-(dev_need.float()/3).clamp(max=1), (settlements.float()/5).clamp(max=1),
        ((roads+ships).float()/15).clamp(max=1), (dev_vp.float()/4).clamp(max=1), one,
        max_other.clamp(max=1), mean_other.clamp(max=1), (progress-max_other).clamp(-1,1),
        (max_income.float()/60).clamp(max=1), zeros,
    ],dim=-1)


def simulate_batch(torch, games, players, rounds, scenario, model, epsilon, device):
    """Vectorized GPU *surrogate* games. No per-match CPU turn loop."""
    D = device
    res = torch.full((games,players,5), 2, dtype=torch.int16, device=D)
    income = 0.12+torch.rand((games,players,5),device=D)*0.18
    if scenario in ('new_shores','fog','seafarers'):
        income += 0.018
    vp = torch.full((games,players),2,dtype=torch.int16,device=D)
    settlements = torch.full((games,players),2,dtype=torch.int16,device=D)
    cities = torch.zeros((games,players),dtype=torch.int16,device=D)
    roads = torch.full((games,players),2,dtype=torch.int16,device=D)
    ships = torch.zeros((games,players),dtype=torch.int16,device=D)
    army = torch.zeros((games,players),dtype=torch.int16,device=D)
    dev_vp = torch.zeros((games,players),dtype=torch.int16,device=D)
    title_road = torch.zeros((games,players),dtype=torch.bool,device=D)
    title_army = torch.zeros((games,players),dtype=torch.bool,device=D)
    done = torch.zeros(games,dtype=torch.bool,device=D)
    win_turn = torch.full((games,),rounds*players,dtype=torch.int32,device=D)
    winner = torch.zeros(games,dtype=torch.int64,device=D)
    chosen = torch.arange(games,device=D)
    target = 14 if players>=6 or scenario!='classic' else 10
    costs = torch.tensor([[0,0,0,2,3],[1,1,1,1,0],[1,1,0,0,0],[1,0,1,0,0],[0,0,1,1,1]],dtype=res.dtype,device=D)
    for round_no in range(rounds):
        for turn in range(players):
            alive = ~done
            dice = torch.randint(1,7,(games,),device=D) + torch.randint(1,7,(games,),device=D)
            if True:
                # Resource generation for all seats for the current dice.
                production = (torch.rand((games,players,5),device=D) < income).to(res.dtype)
                production *= (dice[:,None,None]!=7).to(res.dtype) * alive[:,None,None].to(res.dtype)
                res += production
                # Simplified seven discard; no robber placement.
                discard = (dice==7) & alive
                res = torch.where(discard[:,None,None] & (res.sum(-1,keepdim=True)>7), res//2, res)
            if round_no>0:
                # A sparse abstract bank trade, not player-negotiated trading.
                own = res[:,turn,:]
                donor = own.argmax(-1)
                max_qty = own.gather(1,donor[:,None]).squeeze(1)
                can_trade = alive & (max_qty>=4)
                receiver = own.argmin(-1)
                own[chosen, donor] -= can_trade.to(res.dtype)*4
                own[chosen, receiver] += can_trade.to(res.dtype)
                res[:,turn,:]=own
            hand = res[:,turn,:]
            affordability = (hand[:,None,:]>=costs[None,:,:]).all(-1)
            # City, settlement, road, ship, dev-card preferences. Routes enable
            # hypothetical expansion; no true nodes or edge legality.
            enough_network = roads[:,turn]+ships[:,turn] >= 2*settlements[:,turn]-2
            feasible = torch.stack([
                affordability[:,0] & (settlements[:,turn] > 0) & (cities[:,turn]<4),
                affordability[:,1] & enough_network & (settlements[:,turn]<5),
                affordability[:,2] & (roads[:,turn]<15),
                affordability[:,3] & (ships[:,turn]<15) & (scenario != 'classic'),
                affordability[:,4],
            ],dim=1)
            # Neural prediction is done on-device for every projected candidate.
            # A compact tactical bias preserves immediate VP and expansion values.
            base_features = model_features(torch,vp,res,settlements,cities,roads,ships,army,target,round_no,income,dev_vp)
            local = base_features[:,turn,:]
            p = model['params']
            w1=torch.as_tensor(p['w1'],dtype=torch.float32,device=D)
            b1=torch.as_tensor(p['b1'],dtype=torch.float32,device=D)
            w2=torch.as_tensor(p['w2'],dtype=torch.float32,device=D)
            b2=torch.as_tensor(p['b2'],dtype=torch.float32,device=D)
            current = torch.tanh(torch.tanh(local @ w1.T+b1)@w2+b2)
            # Approximate impact of resources/income on the existing value
            # function. The full board action scorer is not available here.
            base_score = torch.tensor([90,75,26,30 if scenario!='classic' else -100,43],device=D)
            urgency = (target-vp[:,turn].float()).clamp(min=0)
            bonus = torch.stack([
                current*14 + 25, current*12+torch.where(enough_network,25,0),
                torch.where(enough_network,0,torch.full_like(current,55)),
                torch.where(enough_network,torch.full_like(current,10),torch.full_like(current,58)),
                current*8 + torch.where((army[:,turn]>=2),35,0),
            ],1)
            scores = base_score+bonus+torch.rand((games,5),device=D)*30
            scores = torch.where(feasible,scores,torch.full_like(scores,-1e6))
            explore = torch.rand(games,device=D)<epsilon
            scores += explore[:,None]*torch.rand((games,5),device=D)*150
            selected=scores.argmax(1)
            can_act = alive & feasible.any(1)
            res[chosen,turn,:] -= costs[selected]*can_act[:,None].to(res.dtype)
            city = can_act & (selected==0)
            settle = can_act & (selected==1)
            road = can_act & (selected==2)
            ship = can_act & (selected==3)
            dev = can_act & (selected==4)
            cities[:,turn]+=city.to(res.dtype)
            settlements[:,turn]+=settle.to(res.dtype)
            roads[:,turn]+=road.to(res.dtype)
            ships[:,turn]+=ship.to(res.dtype)
            vp[:,turn]+= (city|settle).to(vp.dtype)
            income[:,turn,:] += (city|settle)[:,None].float()*torch.rand((games,5),device=D)*0.023
            if scenario in ('fog','new_shores'):
                # Exploration opportunity is modeled, but actual fog-tile
                # discovery and terrain adjacency are not.
                income[:,turn,:] += ship[:,None].float()*torch.rand((games,5),device=D)*0.032
            card_type=torch.rand((games,),device=D)
            knight=dev & (card_type < 0.57)
            victory_card=dev & (card_type >= 0.57) & (card_type<0.77)
            army[:,turn]+=knight.to(res.dtype)
            dev_vp[:,turn]+=victory_card.to(res.dtype)
            vp[:,turn]+=victory_card.to(vp.dtype)
            # Title ownership is exclusive; award / revoke when lead changes.
            rmax=roads.max(1).values
            amax=army.max(1).values
            new_road=(roads>=5)&(roads==rmax[:,None])&(roads==rmax[:,None])
            new_army=(army>=3)&(army==amax[:,None])
            # Ties do not transfer title. Incumbents retain if tied.
            road_change=(new_road & (roads>roads.masked_fill(title_road,0).max(1).values[:,None])) if False else None
            def claim(title, eligible, score):
                existing=title.any(1)
                best=score.argmax(1)
                new_owner=eligible[chosen,best]
                keep=(title & eligible).any(1)
                must_assign=~keep & new_owner
                title=torch.where(must_assign[:,None],torch.nn.functional.one_hot(best,players).bool(),title & eligible)
                return title
            title_road=claim(title_road,new_road,roads)
            title_army=claim(title_army,new_army,army)
            effective_vp=vp+2*title_road.to(vp.dtype)+2*title_army.to(vp.dtype)
            just_won=alive & (effective_vp.max(1).values>=target)
            winner=torch.where(just_won,effective_vp.argmax(1),winner)
            win_turn=torch.where(just_won,round_no*players+turn+1,win_turn)
            done|=just_won
        # Stop if every match finished: synchronized once per round only.
        if round_no%24==0 and bool(done.all().item()):
            break
    torch.cuda.synchronize() if device.type=='cuda' else None
    actual=vp+2*title_road.to(vp.dtype)+2*title_army.to(vp.dtype)
    final_winner=torch.where(done,winner,actual.argmax(1))
    features=model_features(torch,vp,res,settlements,cities,roads,ships,army,target,rounds,income,dev_vp)
    return {
        'won':int(done.sum().item()),'games':games,'meanTurns':float(win_turn.float().mean().item()),
        'winningSeats':torch.bincount(final_winner,minlength=players).cpu().tolist(),
        'features':features.detach(), 'winner':final_winner, 'rounds':rounds,
        'roadAwards':int(title_road.any(1).sum().item()),'armyAwards':int(title_army.any(1).sum().item()),
        'vpCards':int(dev_vp.sum().item()),
    }


def train_copy(torch, model, result, device, learning_rate, epochs):
    # Supervised experiment on *surrogate* outcomes only. Copy not live weights.
    x=result['features'].reshape(-1,17).detach()
    wins=torch.nn.functional.one_hot(result['winner'],result['features'].shape[1]).reshape(-1).bool()
    y=torch.where(wins,torch.tensor(0.75,device=device),torch.tensor(-0.9,device=device))
    params=model['params']
    w1=torch.nn.Parameter(torch.tensor(params['w1'],device=device,dtype=torch.float32))
    b1=torch.nn.Parameter(torch.tensor(params['b1'],device=device,dtype=torch.float32))
    w2=torch.nn.Parameter(torch.tensor(params['w2'],device=device,dtype=torch.float32).reshape(-1,1))
    b2=torch.nn.Parameter(torch.tensor(params['b2'],device=device,dtype=torch.float32))
    optim=torch.optim.Adam([w1,b1,w2,b2],lr=learning_rate)
    for _ in range(epochs):
        optim.zero_grad(set_to_none=True)
        pred=torch.tanh(torch.tanh(x@w1.T+b1)@w2+b2).flatten()
        loss=((pred-y)**2).mean()
        if not bool(torch.isfinite(loss).item()):
            raise RuntimeError('Non-finite arena loss; candidate not saved')
        loss.backward()
        torch.nn.utils.clip_grad_norm_([w1,b1,w2,b2],max_norm=1.0)
        optim.step()
    params.update(w1=w1.detach().cpu().tolist(),b1=b1.detach().cpu().tolist(),w2=w2.flatten().detach().cpu().tolist(),b2=float(b2.detach().cpu().item()))
    return float(loss.item())


def run(args, device_name='cuda:0'):
    import torch
    if device_name.startswith('cuda') and not torch.cuda.is_available():
        raise RuntimeError('CUDA is not available; GPU arena cannot run. No CPU substitution is allowed in this mode.')
    device=torch.device(device_name)
    run_dir=pathlib.Path(args.output).resolve()
    run_dir.mkdir(parents=True,exist_ok=True)
    checkpoint=run_dir/'arena_checkpoint.json'
    candidate=run_dir/'gpu_arena_candidate.json'
    base=json.loads(pathlib.Path(args.model).read_text(encoding='utf-8'))
    model=json.loads(candidate.read_text(encoding='utf-8')) if args.resume and candidate.exists() else base
    prior=json.loads(checkpoint.read_text(encoding='utf-8')) if args.resume and checkpoint.exists() else None
    config={ 'games':args.games,'batch':args.batch,'players':args.players,'scenario':args.scenario,
        'rounds':args.rounds,'seed':args.seed,'epsilon':args.epsilon,'trainCopy':args.train_copy,
        'epochs':args.epochs,'learningRate':args.learning_rate }
    if prior and prior['config']!=config: raise RuntimeError('Cannot resume: arena settings differ from checkpoint')
    if prior and not candidate.exists() and args.train_copy: raise RuntimeError('Cannot resume: trained candidate file missing')
    if not prior and args.resume: raise RuntimeError('Cannot resume: arena checkpoint not found')
    progress=prior['completed'] if prior else 0
    stats=prior['stats'] if prior else { 'wins':0, 'turnSum':0, 'seats':[0]*args.players, 'roadAwards':0, 'armyAwards':0, 'vpCards':0 }
    seed=args.seed
    torch.manual_seed(seed)
    started=time.time()
    print(f'[gpu-arena] CUDA abstract simulation: device={device_name} batch={args.batch:,} players={args.players} rounds={args.rounds} (NOT full Hex Settlers)',flush=True)
    while progress<args.games:
        count=min(args.batch,args.games-progress)
        try:
            result=simulate_batch(torch,count,args.players,args.rounds,args.scenario,model,args.epsilon,device)
            if args.train_copy: train_copy(torch,model,result,device,args.learning_rate,args.epochs)
        except RuntimeError as exc:
            if 'out of memory' in str(exc).lower():
                raise RuntimeError(f'CUDA out of memory at {count:,} rollouts. Lower GPU arena batch size in the dashboard.') from exc
            raise
        stats['wins']+=result['won']
        stats['turnSum']+=result['meanTurns']*count
        stats['seats']=[a+b for a,b in zip(stats['seats'],result['winningSeats'])]
        for field in ('roadAwards','armyAwards','vpCards'):stats[field]+=result[field]
        progress+=count
        if args.train_copy:
            model['meta']={**model.get('meta',{}),'experimentalGpuArena':{'surrogateGames':progress,'scenario':args.scenario,'players':args.players,'notRuleEquivalent':True}}
            # Game counter reserved exclusively for real server simulation.
            model['trainedGames']=base['trainedGames']
            atomic_json(candidate,model)
        if device.type=='cuda':
            stats['peakAllocatedMiB']=round(torch.cuda.max_memory_allocated(device)/1048576,1)
            stats['peakReservedMiB']=round(torch.cuda.max_memory_reserved(device)/1048576,1)
        atomic_json(checkpoint,{'config':config,'completed':progress,'stats':stats,'updatedAt':time.time()})
        print(f'[gpu-arena] {progress}/{args.games} completed | {progress/max(time.time()-started,0.01):.1f} GPU abstract games/s | peak reserved {stats.get("peakReservedMiB","n/a")} MiB',flush=True)
        if args.control_file and pathlib.Path(args.control_file).exists():
            try:
                if json.loads(pathlib.Path(args.control_file).read_text())['pause']:
                    print('[gpu-arena] pause requested; checkpoint committed',flush=True)
                    return 75
            except (ValueError,KeyError): pass
    print('[gpu-arena] Complete. This is an abstract GPU simulator, not the production game engine. Results are NOT authoritative training games.',flush=True)
    return 0


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--games',type=int,default=20000)
    parser.add_argument('--batch',type=int,default=32768)
    parser.add_argument('--players',type=int,default=8)
    parser.add_argument('--scenario',choices=('classic','seafarers','fog','new_shores'),default='new_shores')
    parser.add_argument('--rounds',type=int,default=120)
    parser.add_argument('--seed',type=int,default=7731)
    parser.add_argument('--epsilon',type=float,default=0.12)
    parser.add_argument('--learning-rate',type=float,default=0.0008)
    parser.add_argument('--epochs',type=int,default=2)
    parser.add_argument('--train-copy',action='store_true')
    parser.add_argument('--resume',action='store_true')
    parser.add_argument('--control-file',default='')
    parser.add_argument('--cpu-reference',action='store_true',help='TESTS ONLY: explicitly run on CPU')
    args=parser.parse_args()
    if not 1<=args.games<=100000000 or not 1<=args.batch<=1048576 or not 4<=args.players<=8 or not 10<=args.rounds<=1500 or not 0<=args.epsilon<=1 or not 1<=args.epochs<=20 or not 0<args.learning_rate<=0.01:
        parser.error('Invalid arena configuration')
    return run(args,'cpu' if args.cpu_reference else 'cuda:0')


if __name__=='__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(f'[gpu-arena] ERROR: {error}',file=sys.stderr,flush=True)
        sys.exit(1)
