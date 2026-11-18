/* eslint-disable @typescript-eslint/no-require-imports -- plain Node preload (CommonJS). */
// Scripts (seed, admin:promote, checks) run outside Next.js. Two server-only
// pieces need a stand-in there:
// - "server-only": a marker that keeps server code out of client bundles;
//   it is a no-op here.
// - "next-intl/server": translations come from the request locale in Next.js;
//   scripts use the English catalog.
const path = require("node:path");
const Module = require("node:module");

let intlServer = null;
function scriptIntlServer() {
  if (intlServer) return intlServer;
  const { createTranslator } = require("next-intl");
  const { getMessages } = require(path.join(__dirname, "../src/i18n/messages.ts"));
  const messages = getMessages("en");
  intlServer = {
    getLocale: async () => "en",
    getTranslations: async (options) => {
      const namespace = typeof options === "string" ? options : options?.namespace;
      return createTranslator({ locale: "en", messages, namespace });
    },
  };
  return intlServer;
}

const original = Module._load;
Module._load = function load(request, ...rest) {
  if (request === "server-only") return {};
  if (request === "next-intl/server") return scriptIntlServer();
  return original.call(this, request, ...rest);
};
