import type { onSendHookHandler, preSerializationHookHandler } from 'fastify';
import type { FastifyInstance } from 'fastify';
import plugin from 'fastify-plugin';

/**
 * Type guard to check if something is a JSX element
 * With Kita, JSX elements are compiled to string literals
 */
const isJsxElement = (payload: unknown): boolean => {
  // When using Kita, JSX elements are compiled to strings
  // with HTML content, so we can check for that
  return typeof payload === 'string' && payload.trim().startsWith('<');
};

/**
 * The preserialization hook transforms JSX elements into a specially marked object
 * before JSON serialization
 */
const preSerialization: preSerializationHookHandler<unknown> = async (
  _request,
  reply,
  payload: unknown
) => {
  if (isJsxElement(payload)) {
    void reply.header('Content-Type', 'text/html; charset=utf8');
    return {
      ___jsx: `<!DOCTYPE html>\n${payload}`,
    };
  }

  return payload;
};

/**
 * The onSend hook unwraps the HTML content from our specially marked object
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
  _opts: Record<string, unknown>,
  done: (err?: Error) => void
) => {
  fastify.addHook('preSerialization', preSerialization);
  fastify.addHook('onSend', onSend);
  done();
};

export default plugin(renderJsx);
