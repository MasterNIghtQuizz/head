import Fastify from 'fastify';
import {config} from './config.js';

const fastify = Fastify({logger: true});

fastify.get('/health', async () => {
    return {status: 'ok', service: 'core'};
});

await fastify.listen({host: '0.0.0.0', port: config.port});