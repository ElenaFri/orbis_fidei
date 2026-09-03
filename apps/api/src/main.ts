import { buildApp } from './app.js';
import { config } from './config.js';

async function start(): Promise<void> {
    const app = await buildApp();

    const shutdown = async (signal: string): Promise<void> => {
        app.log.info({ signal }, 'Arrêt du serveur…');
        await app.close();
        process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    try {
        await app.listen({ host: config.API_HOST, port: config.API_PORT });
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

await start();
