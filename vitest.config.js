import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js":
        path.resolve("__mocks__/firebase-firestore.js"),
      "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js":
        path.resolve("__mocks__/firebase-app.js"),
      "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js":
        path.resolve("__mocks__/firebase-storage.js"),
    },
  },
  test: {
    include: ["**/*.test.js"],
    exclude: ["**/._*", "**/node_modules/**"],
  },
});
