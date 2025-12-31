// @refresh reload
import { StartServer, createHandler } from "@solidjs/start/server";
import { hasSuperusers } from "./api/startup";
import { PATHS } from "./lib/constants";

// Check for superusers on server startup
(async () => {
  try {
    const superusersExist = await hasSuperusers();
    if (!superusersExist) {
      console.log(
        `⚠️  No superusers found. Please create one at: https://localhost:3000${PATHS.auth.setup}`
      );
    }
  } catch (error) {
    console.error("Error checking for superusers on startup:", error);
  }
})();

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
