import swaggerUi from "swagger-ui-express";
import fs from "fs";
import * as yaml from "js-yaml";
import path from "path";

const loadYaml = yaml.load || (yaml as unknown as { default: typeof yaml }).default?.load;

const swaggerDocument = loadYaml(
  fs.readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf8"),
) as Record<string, unknown>;

export { swaggerUi, swaggerDocument };
