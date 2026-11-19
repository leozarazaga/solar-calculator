import http from "node:http";
import dotenv from "dotenv";
import app from "./src/app";

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer(app);

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.syscall !== "listen") {
    throw error;
  }

  switch (error.code) {
    case "EACCES":
      console.error(`Port ${PORT} requires elevated privileges.`);
      process.exit(1);
    case "EADDRINUSE":
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    default:
      throw error;
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
