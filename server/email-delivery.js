'use strict';

const fs = require('node:fs/promises');
const dns = require('node:dns').promises;
const net = require('node:net');
const path = require('node:path');
const tls = require('node:tls');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateEmailAddress(email) {
  const value = normalizeEmail(email);
  if (!value) return { ok: false, error: 'Enter an email address.' };
  if (value.length > 254) return { ok: false, error: 'Email address is too long.' };
  // Deliberately conservative. This accepts ordinary mailbox addresses while
  // rejecting control characters, spaces, malformed domains, and header input.
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, value };
}

function maskEmail(email) {
  const value = normalizeEmail(email);
  const at = value.indexOf('@');
  if (at <= 0) return '';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, Math.min(8, local.length - visible.length)))}@${domain}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function booleanEnv(env, name, fallback = false) {
  const raw = String(env && env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return fallback;
}

function integerEnv(env, name, fallback, min, max) {
  const raw = env && env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function emailDeliveryMode(env = process.env) {
  if (String(env.HEX_EMAIL_CAPTURE_PATH || '').trim()) return 'capture';
  const requested = String(env.HEX_EMAIL_MODE || '').trim().toLowerCase();
  if (requested === 'none' || requested === 'disabled' || requested === 'off') return 'none';
  if (requested === 'direct' || requested === 'self' || requested === 'self-hosted') return 'direct';
  if (requested === 'resend') return String(env.RESEND_API_KEY || '').trim() ? 'resend' : 'none';
  if (requested === 'smtp') return String(env.SMTP_HOST || '').trim() ? 'smtp' : 'none';
  if (String(env.RESEND_API_KEY || '').trim()) return 'resend';
  if (String(env.SMTP_HOST || '').trim()) return 'smtp';
  // No provider is required: deliver straight to the recipient domain's MX host.
  return 'direct';
}

function isEmailDeliveryConfigured(env = process.env) {
  return emailDeliveryMode(env) !== 'none';
}

function fromAddress(env = process.env) {
  const configured = String(env.HEX_EMAIL_FROM || env.SMTP_FROM || 'Hex Settlers <no-reply@tenthson.com>').trim();
  return configured || 'Hex Settlers <no-reply@tenthson.com>';
}

function messageIdDomain(from) {
  const match = String(from || '').match(/@([^>\s]+)/);
  return (match && match[1]) || 'localhost';
}

function envelopeAddress(from) {
  const value = String(from || '').trim();
  const match = value.match(/<([^>]+)>/) || value.match(/([^\s<>]+@[^\s<>]+)/);
  const validation = validateEmailAddress(match ? match[1] : value);
  if (!validation.ok) throw new Error('HEX_EMAIL_FROM must contain a valid sender email address.');
  return validation.value;
}

function directEhloName(env, from) {
  const configured = String(env.HEX_EMAIL_EHLO_NAME || env.SMTP_EHLO_NAME || '').trim().toLowerCase();
  if (configured && /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(configured)) return configured;
  return envelopeAddress(from).split('@')[1];
}

function isPublicMailAddress(address) {
  const value = String(address || '').trim().toLowerCase();
  const family = net.isIP(value);
  if (family === 4) {
    const octets = value.split('.').map(Number);
    const [a, b, c] = octets;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (family === 6) {
    if (value === '::' || value === '::1') return false;
    if (value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value)) return false;
    if (value.startsWith('ff') || value.startsWith('2001:db8:')) return false;
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPublicMailAddress(mapped[1]) : true;
  }
  return false;
}

function stripCrlf(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function formatSmtpMessage({ from, to, subject, text, html }) {
  const boundary = `hex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const safeFrom = stripCrlf(from);
  const safeTo = stripCrlf(to);
  const safeSubject = stripCrlf(subject);
  const headers = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}@${messageIdDomain(safeFrom)}>`,
    'MIME-Version: 1.0',
  ];
  if (html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(text || ''),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(html || ''),
      `--${boundary}--`,
      '',
    ].join('\r\n');
  }
  headers.push('Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit');
  return [...headers, '', String(text || ''), ''].join('\r\n');
}

function smtpReader(socket) {
  let buffer = '';
  const lines = [];
  const waiters = [];
  let terminalError = null;

  const wake = () => {
    while (waiters.length && lines.length) waiters.shift().resolve(lines.shift());
    if (terminalError) while (waiters.length) waiters.shift().reject(terminalError);
  };
  const onData = (chunk) => {
    buffer += String(chunk);
    for (;;) {
      const index = buffer.indexOf('\n');
      if (index < 0) break;
      lines.push(buffer.slice(0, index + 1).replace(/\r?\n$/, ''));
      buffer = buffer.slice(index + 1);
    }
    wake();
  };
  const fail = (error) => {
    terminalError = error instanceof Error ? error : new Error(String(error || 'SMTP connection closed.'));
    wake();
  };
  const onEnd = () => fail(new Error('SMTP connection closed unexpectedly.'));
  socket.on('data', onData);
  socket.on('error', fail);
  socket.on('end', onEnd);

  async function nextLine() {
    if (lines.length) return lines.shift();
    if (terminalError) throw terminalError;
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }

  return {
    async response() {
      const responseLines = [];
      let code = 0;
      for (;;) {
        const line = await nextLine();
        const match = line.match(/^(\d{3})([ -])(.*)$/);
        if (!match) continue;
        code = Number(match[1]);
        responseLines.push(line);
        if (match[2] === ' ') return { code, lines: responseLines, text: responseLines.join('\n') };
      }
    },
    dispose() {
      socket.off('data', onData);
      socket.off('error', fail);
      socket.off('end', onEnd);
    },
  };
}

function waitForConnect(socket, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off(eventName, onReady);
      socket.off('error', onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = (error) => { cleanup(); reject(error); };
    socket.once(eventName, onReady);
    socket.once('error', onError);
  });
}

async function expectSmtp(reader, expected, context) {
  const response = await reader.response();
  const accepted = Array.isArray(expected) ? expected : [expected];
  if (!accepted.includes(response.code)) throw new Error(`${context}: ${response.text}`);
  return response;
}

async function sendViaSmtp(message, env = process.env) {
  const host = String(env.SMTP_HOST || '').trim();
  if (!host) throw new Error('SMTP_HOST is not configured.');
  const secure = booleanEnv(env, 'SMTP_SECURE', integerEnv(env, 'SMTP_PORT', 587, 1, 65535) === 465);
  const port = integerEnv(env, 'SMTP_PORT', secure ? 465 : 587, 1, 65535);
  const rejectUnauthorized = !booleanEnv(env, 'SMTP_ALLOW_SELF_SIGNED', false);
  const timeoutMs = integerEnv(env, 'SMTP_TIMEOUT_MS', 15_000, 1_000, 120_000);

  let socket = secure
    ? tls.connect({ host, port, servername: host, rejectUnauthorized })
    : net.connect({ host, port });
  socket.setTimeout(timeoutMs, () => socket.destroy(new Error('SMTP connection timed out.')));
  await waitForConnect(socket, secure ? 'secureConnect' : 'connect');
  let reader = smtpReader(socket);
  await expectSmtp(reader, 220, 'SMTP greeting failed');

  const sendCommand = async (command, expected, context) => {
    socket.write(`${command}\r\n`);
    return expectSmtp(reader, expected, context);
  };

  let ehlo = await sendCommand(`EHLO ${stripCrlf(env.SMTP_EHLO_NAME || 'hex-settlers')}`, 250, 'SMTP EHLO failed');
  const supportsStartTls = ehlo.lines.some((line) => /STARTTLS/i.test(line));
  if (!secure && supportsStartTls && !booleanEnv(env, 'SMTP_DISABLE_STARTTLS', false)) {
    await sendCommand('STARTTLS', 220, 'SMTP STARTTLS failed');
    reader.dispose();
    socket = tls.connect({ socket, servername: host, rejectUnauthorized });
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error('SMTP connection timed out.')));
    await waitForConnect(socket, 'secureConnect');
    reader = smtpReader(socket);
    ehlo = await sendCommand(`EHLO ${stripCrlf(env.SMTP_EHLO_NAME || 'hex-settlers')}`, 250, 'SMTP EHLO after STARTTLS failed');
  } else if (!secure && booleanEnv(env, 'SMTP_REQUIRE_TLS', true) && !supportsStartTls) {
    socket.destroy();
    throw new Error('SMTP server does not advertise STARTTLS. Set SMTP_REQUIRE_TLS=false only for a trusted local relay.');
  }

  const user = String(env.SMTP_USER || '').trim();
  const pass = String(env.SMTP_PASS || '');
  if (user) {
    const auth = Buffer.from(`\0${user}\0${pass}`, 'utf8').toString('base64');
    await sendCommand(`AUTH PLAIN ${auth}`, 235, 'SMTP authentication failed');
  }

  const from = fromAddress(env);
  const envelopeFrom = envelopeAddress(from);
  await sendCommand(`MAIL FROM:<${stripCrlf(envelopeFrom)}>`, 250, 'SMTP MAIL FROM failed');
  await sendCommand(`RCPT TO:<${stripCrlf(message.to)}>`, [250, 251], 'SMTP RCPT TO failed');
  await sendCommand('DATA', 354, 'SMTP DATA failed');
  const raw = formatSmtpMessage({ ...message, from });
  const dotStuffed = raw.replace(/(^|\r\n)\./g, '$1..');
  socket.write(`${dotStuffed}\r\n.\r\n`);
  await expectSmtp(reader, 250, 'SMTP message delivery failed');
  try { await sendCommand('QUIT', 221, 'SMTP QUIT failed'); } catch (_) {}
  socket.end();
  return { ok: true, provider: 'smtp' };
}

async function directMxTargets(recipient, resolver = dns) {
  const domain = normalizeEmail(recipient).split('@')[1];
  if (!domain) throw new Error('Recipient email domain is missing.');
  let records = [];
  try {
    records = await resolver.resolveMx(domain);
  } catch (error) {
    if (!error || !['ENODATA', 'ENOTFOUND'].includes(error.code)) throw error;
  }
  const hosts = records.length
    ? records.filter((record) => record && record.exchange && record.exchange !== '.')
      .sort((left, right) => Number(left.priority || 0) - Number(right.priority || 0))
      .map((record) => String(record.exchange).replace(/\.$/, ''))
    : [domain];
  if (!hosts.length) throw new Error(`The recipient domain ${domain} does not accept email.`);

  const targets = [];
  for (const host of hosts) {
    let addresses = [];
    try { addresses = await resolver.lookup(host, { all: true, verbatim: false }); }
    catch (_) { continue; }
    for (const address of addresses) {
      if (!address || !isPublicMailAddress(address.address)) continue;
      targets.push({ host, address: address.address, family: address.family });
    }
  }
  if (!targets.length) throw new Error(`No public mail server could be resolved for ${domain}.`);
  return targets;
}

async function deliverDirectToMx(message, target, env) {
  const timeoutMs = integerEnv(env, 'HEX_DIRECT_EMAIL_TIMEOUT_MS', 15_000, 1_000, 120_000);
  const from = fromAddress(env);
  const envelopeFrom = envelopeAddress(from);
  const ehloName = directEhloName(env, from);
  let socket = net.connect({ host: target.address, port: 25, family: target.family });
  socket.setTimeout(timeoutMs, () => socket.destroy(new Error('Direct SMTP connection timed out.')));
  await waitForConnect(socket, 'connect');
  let reader = smtpReader(socket);

  const sendCommand = async (command, expected, context) => {
    socket.write(`${command}\r\n`);
    return expectSmtp(reader, expected, context);
  };

  try {
    await expectSmtp(reader, 220, 'Recipient mail server greeting failed');
    let ehlo = await sendCommand(`EHLO ${stripCrlf(ehloName)}`, 250, 'Recipient mail server EHLO failed');
    const supportsStartTls = ehlo.lines.some((line) => /STARTTLS/i.test(line));
    if (supportsStartTls) {
      await sendCommand('STARTTLS', 220, 'Recipient mail server STARTTLS failed');
      reader.dispose();
      socket = tls.connect({ socket, servername: target.host, rejectUnauthorized: true });
      socket.setTimeout(timeoutMs, () => socket.destroy(new Error('Direct SMTP TLS connection timed out.')));
      await waitForConnect(socket, 'secureConnect');
      reader = smtpReader(socket);
      ehlo = await sendCommand(`EHLO ${stripCrlf(ehloName)}`, 250, 'Recipient mail server EHLO after STARTTLS failed');
    } else if (booleanEnv(env, 'HEX_DIRECT_EMAIL_REQUIRE_TLS', false)) {
      throw new Error('Recipient mail server does not offer STARTTLS.');
    }

    await sendCommand(`MAIL FROM:<${stripCrlf(envelopeFrom)}>`, 250, 'Recipient rejected sender');
    await sendCommand(`RCPT TO:<${stripCrlf(message.to)}>`, [250, 251], 'Recipient rejected mailbox');
    await sendCommand('DATA', 354, 'Recipient rejected message data');
    const raw = formatSmtpMessage({ ...message, from });
    const dotStuffed = raw.replace(/(^|\r\n)\./g, '$1..');
    socket.write(`${dotStuffed}\r\n.\r\n`);
    await expectSmtp(reader, 250, 'Recipient mail server did not accept the message');
    try { await sendCommand('QUIT', 221, 'Recipient mail server QUIT failed'); } catch (_) {}
    socket.end();
    return { ok: true, provider: 'direct', mxHost: target.host };
  } finally {
    try { reader.dispose(); } catch (_) {}
    if (!socket.destroyed) socket.destroy();
  }
}

async function sendViaDirectMx(message, env = process.env) {
  const targets = await directMxTargets(message.to);
  const errors = [];
  for (const target of targets) {
    try {
      return await deliverDirectToMx(message, target, env);
    } catch (error) {
      errors.push(`${target.host}: ${error && error.message ? error.message : error}`);
    }
  }
  throw new Error(`Direct email delivery failed. ${errors.slice(0, 3).join(' | ')}`);
}

async function sendViaResend(message, env = process.env) {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(env),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error((payload && payload.message) || `Resend returned HTTP ${response.status}.`);
  return { ok: true, provider: 'resend', id: payload && payload.id };
}

async function captureEmail(message, env = process.env) {
  const capturePath = path.resolve(String(env.HEX_EMAIL_CAPTURE_PATH || '').trim());
  await fs.mkdir(path.dirname(capturePath), { recursive: true });
  await fs.appendFile(capturePath, `${JSON.stringify({ ...message, capturedAt: Date.now() })}\n`, 'utf8');
  return { ok: true, provider: 'capture', path: capturePath };
}

async function sendTransactionalEmail(message, env = process.env) {
  const validation = validateEmailAddress(message && message.to);
  if (!validation.ok) throw new Error(validation.error);
  const normalized = {
    to: validation.value,
    subject: stripCrlf(message.subject || 'Hex Settlers'),
    text: String(message.text || ''),
    html: message.html ? String(message.html) : '',
  };
  const mode = emailDeliveryMode(env);
  if (mode === 'capture') return captureEmail(normalized, env);
  if (mode === 'resend') return sendViaResend(normalized, env);
  if (mode === 'smtp') return sendViaSmtp(normalized, env);
  if (mode === 'direct') return sendViaDirectMx(normalized, env);
  throw new Error('Password email delivery is not configured.');
}

module.exports = {
  emailDeliveryMode,
  escapeHtml,
  isEmailDeliveryConfigured,
  isPublicMailAddress,
  maskEmail,
  normalizeEmail,
  sendTransactionalEmail,
  validateEmailAddress,
};
