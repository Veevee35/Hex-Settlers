"""Reference-only numerical tests. CUDA availability is checked separately on a GPU PC."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from neural_cuda_optimizer import validate_samples, run_refinement


class NeuralOptimizerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.model = Path(self.temp.name) / 'model.json'
        self.samples = Path(self.temp.name) / 'samples.jsonl'
        original = Path(__file__).resolve().parent.parent / 'neural_ai_model.json'
        self.model.write_bytes(original.read_bytes())
        self.original = json.loads(self.model.read_text())
        features = self.original['meta']['inputSize']
        self.samples.write_text('\n'.join(json.dumps({
            'gameId': 'test-game-' + str(index),
            'samples': [{'features': [0.3 + index/50] + [0.2] * (features-1), 'target': (-0.7 if index%2 else 0.8)}],
        }) for index in range(10)) + '\n')

    def test_sample_data_requires_unique_game_ids(self):
        examples, games = validate_samples(self.samples, self.original['meta']['inputSize'])
        self.assertEqual(len(examples), 10)
        self.assertEqual(games, 10)
        with self.samples.open('a') as handle:
            handle.write(json.dumps({'gameId':'test-game-0','samples':[]}) + '\n')
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            validate_samples(self.samples, self.original['meta']['inputSize'])

    def test_refinement_preserves_counter_and_model_shape(self):
        # This exercises identical tensor math on CPU to test numerical code.
        # It is not a CUDA throughput or CUDA driver test.
        run_refinement(SimpleNamespace(model=str(self.model),samples=str(self.samples),epochs=3,mini_batch=32,learning_rate=0.0008), device_name='cpu')
        trained = json.loads(self.model.read_text())
        self.assertEqual(trained['trainedGames'], self.original['trainedGames'])
        self.assertEqual(len(trained['params']['w1']),len(self.original['params']['w1']))
        self.assertEqual(len(trained['params']['w1'][0]),len(self.original['params']['w1'][0]))
        details = trained['meta']['lastCudaRefinement']
        self.assertLessEqual(details['finalLoss'],details['initialLoss'])


if __name__ == '__main__':
    unittest.main()
