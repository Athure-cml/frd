import type { ChildProcess } from 'node:child_process';
import type { PluginOption } from 'vite';

import type { NitroMockPluginOptions } from '../typing';

import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { colors, consola, getPackage } from '@vben/node-utils';

import getPort from 'get-port';
import { build, createDevServer, createNitro, prepare } from 'nitropack';

const hmrKeyRe = /^runtimeConfig\.|routeRules\./;

/** Windows 下 nitro-dev 对含中文等非 ASCII 路径的 ESM 加载不稳定 */
const useProductionMockServer = process.platform === 'win32';

let productionMockChild: ChildProcess | null = null;

export const viteNitroMockPlugin = ({
  mockServerPackage = '@vben/backend-mock',
  port = 5320,
  verbose = true,
}: NitroMockPluginOptions = {}): PluginOption => {
  return {
    async configureServer(server) {
      const availablePort = await getPort({ port });
      if (availablePort !== port) {
        return;
      }

      const pkg = await getPackage(mockServerPackage);
      if (!pkg) {
        consola.log(
          `Package ${mockServerPackage} not found. Skip mock server.`,
        );
        return;
      }

      await runNitroServer(pkg.dir, port, verbose);

      server.httpServer?.on('close', () => {
        productionMockChild?.kill();
        productionMockChild = null;
      });

      const _printUrls = server.printUrls;
      server.printUrls = () => {
        _printUrls();

        consola.log(
          `  ${colors.green('➜')}  ${colors.bold('Nitro Mock Server')}: ${colors.cyan(`http://localhost:${port}/api`)}`,
        );
      };
    },
    enforce: 'pre',
    name: 'vite:mock-server',
  };
};

async function runProductionNitroServer(
  rootDir: string,
  port: number,
  verbose: boolean,
) {
  productionMockChild?.kill();
  productionMockChild = null;

  if (verbose) {
    consola.info(
      'Building Nitro Mock Server (Windows uses production build for compatibility)...',
    );
  }

  const nitro = await createNitro({
    dev: false,
    preset: 'node-server',
    rootDir,
  });
  await prepare(nitro);
  await build(nitro);
  await nitro.close();

  const entry = join(rootDir, '.output/server/index.mjs');
  productionMockChild = spawn(process.execPath, [entry], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: verbose ? 'inherit' : 'ignore',
  });

  productionMockChild.on('error', (error) => {
    consola.error('Nitro Mock Server failed to start:', error);
  });

  if (verbose) {
    console.log('');
    consola.success(colors.bold(colors.green('Nitro Mock Server started.')));
  }
}

async function runNitroDevServer(
  rootDir: string,
  port: number,
  verbose: boolean,
) {
  let nitro: any;
  const reload = async () => {
    if (nitro) {
      consola.info('Restarting dev server...');
      if ('unwatch' in nitro.options._c12) {
        await nitro.options._c12.unwatch();
      }
      await nitro.close();
    }
    nitro = await createNitro(
      {
        dev: true,
        preset: 'nitro-dev',
        rootDir,
      },
      {
        c12: {
          async onUpdate({ getDiff, newConfig }) {
            const diff = getDiff();
            if (diff.length === 0) {
              return;
            }
            verbose &&
              consola.info(
                `Nitro config updated:\n${diff
                  .map((entry) => entry.toString())
                  .join('\n')}`,
              );
            await (diff.every((e) => hmrKeyRe.test(e.key))
              ? nitro.updateConfig(newConfig.config)
              : reload());
          },
        },
        watch: true,
      },
    );
    nitro.hooks.hookOnce('restart', reload);

    const server = createDevServer(nitro);
    await server.listen(port, { showURL: false });
    await prepare(nitro);
    await build(nitro);

    if (verbose) {
      console.log('');
      consola.success(colors.bold(colors.green('Nitro Mock Server started.')));
    }
  };
  return await reload();
}

async function runNitroServer(rootDir: string, port: number, verbose: boolean) {
  if (useProductionMockServer) {
    return runProductionNitroServer(rootDir, port, verbose);
  }
  return runNitroDevServer(rootDir, port, verbose);
}
