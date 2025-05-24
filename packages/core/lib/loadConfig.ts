import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ConfigEnvSchema, type ConfigEnv } from '../types';

// This helper is for the tasks that need to validate and load the config
// but don't have access to Fastify (which does it automatically via a plugin)
export const loadConfig = (source = process.env): ConfigEnv => {
  if (!Object.keys(source).some((key) => key.startsWith('BXD_'))) {
    throw new Error(
      "The .env configuration file hasn't been loaded correctly."
    );
  }

  const ajv = new Ajv({
    useDefaults: true,
    removeAdditional: true, // or 'all' or 'failing'
  });

  addFormats(ajv);

  const validate = ajv.compile(ConfigEnvSchema);
  const input = { ...source };

  if (!validate(input)) {
    throw new Error(
      `Config validation failed: ${JSON.stringify(validate.errors)}`
    );
  }

  // Extract only the properties defined in the schema
  const config: Partial<ConfigEnv> = {};
  const properties = ConfigEnvSchema.properties;

  for (const key in properties) {
    const typedKey = key as keyof ConfigEnv;
    if (typedKey in input) {
      if (input[typedKey] !== undefined) {
        // biome-ignore lint:
        config[typedKey] = input[typedKey] as any;
      }
    }
  }

  return config as ConfigEnv;
};
