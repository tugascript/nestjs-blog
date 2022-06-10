import { MercuriusDriverPlugin } from '../interfaces/mercurius-driver-plugin.interface';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export async function addPlugins(
  app: NestFastifyApplication,
  plugins?: MercuriusDriverPlugin[],
): Promise<void> {
  if (plugins && plugins.length > 0) {
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      await app.register(plugin.plugin, plugin.options);
    }
  }
}
