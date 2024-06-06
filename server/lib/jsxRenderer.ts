// Almost directly from https://evertpot.com/jsx-template/
import type { onSendHookHandler, preSerializationHookHandler } from 'fastify';
import { isValidElement, type JSX } from 'preact';
import render from 'preact-render-to-string';
import type { FastifyInstance } from 'fastify';
import plugin from 'fastify-plugin';

/**
 * The preserialization hook lets us transform the response body
 * before it's json-encoded.
 *
 * We use this to turn React components into an object with a ___jsx key
 * that has the serialized HTML.
 */
const preSerialization: preSerializationHookHandler<unknown> = async (
  _request,
  reply,
  payload: unknown
) => {
  if (isValidElement(payload)) {
    void reply.header('Content-Type', 'text/html; charset=utf8');
    return {
      ___jsx: `<!DOCTYPE html>\n${render(payload as JSX.Element)}`,
    };
  }

  return payload;
};

/**
 * The onSendHookHandler lets us transform the response body (as a string)
 * We detect the ___jsx key and unwrap the HTML.
 */
const onSend: onSendHookHandler<unknown> = async (
  _request,
  _reply,
  payload: unknown
) => {
  if (typeof payload === 'string' && payload.startsWith('{"___jsx":"')) {
    return JSON.parse(payload).___jsx;
  }
  return payload;
};

const renderJsx = (
  fastify: FastifyInstance,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  _opts: any,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  done: (err?: any) => void
) => {
  fastify.addHook('preSerialization', preSerialization);
  fastify.addHook('onSend', onSend);
  done();
};

export default plugin(renderJsx);
