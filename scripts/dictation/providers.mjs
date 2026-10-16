// Proveedores de LLM. Todos reciben un prompt y devuelven el texto de la respuesta.
import { spawn } from 'node:child_process';

async function anthropic(prompt, opts) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');
  const response = await fetch(process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-5-5',
      max_tokens: opts.maxTokens ?? 16000,
      temperature: opts.temperature ?? 0.8,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const data = await response.json();
  return data.content.filter((part) => part.type === 'text').map((part) => part.text).join('');
}

/** Cualquier API compatible con OpenAI: OpenAI, OpenRouter, Ollama (…/v1), LM Studio, vLLM. */
async function openai(prompt, opts) {
  const base = (opts.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'http://localhost:11434/v1').replace(/\/$/, '');
  if (!opts.model) throw new Error('Con --provider openai hay que indicar --model');
  const headers = { 'content-type': 'application/json' };
  if (process.env.OPENAI_API_KEY) headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0.8,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`OpenAI-compatible ${response.status}: ${(await response.text()).slice(0, 400)}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** Claude Code en modo no interactivo (usa tu sesión de `claude`). */
function claudeCli(prompt, opts) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'text'];
    if (opts.model) args.push('--model', opts.model);
    const child = spawn(process.env.CLAUDE_BIN ?? 'claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`claude salió con ${code}: ${err.slice(0, 400)}`))));
    child.stdin.end(prompt);
  });
}

const PROVIDERS = { anthropic, openai, 'claude-cli': claudeCli };

export function providerNames() {
  return Object.keys(PROVIDERS);
}

export async function complete(name, prompt, opts = {}) {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Proveedor desconocido: ${name}. Opciones: ${providerNames().join(', ')} (o «prompt»/«ingest» para hacerlo a mano)`);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await provider(prompt, opts);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

/** Saca el primer arreglo JSON de la respuesta (tolera ```json y texto alrededor). */
export function parseJsonArray(text) {
  const cleaned = String(text).replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('La respuesta no trae un arreglo JSON');
  const value = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(value)) throw new Error('La respuesta no es un arreglo');
  return value;
}
