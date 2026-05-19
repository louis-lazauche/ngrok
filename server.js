import express from "express";
import crypto from "crypto";
import { spawn } from "child_process";
import "dotenv/config";

const app = express();

// IMPORTANT: raw body required for GitHub signature verification
app.post("/webhook/github", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return res.status(500).send("Missing GITHUB_WEBHOOK_SECRET");

    const sigHeader = req.header("X-Hub-Signature-256");
    if (!sigHeader) return res.status(401).send("Missing signature header");

    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(req.body).digest("hex");

    const ok = crypto.timingSafeEqual(
      Buffer.from(sigHeader),
      Buffer.from(expected)
    );

    if (!ok) return res.status(401).send("Invalid signature");

    const payload = JSON.parse(req.body.toString("utf8"));

    const event = req.header("X-GitHub-Event");
    if (event !== "push") return res.status(200).send("Ignored event");

    const targetBranch = process.env.TARGET_BRANCH || "main";
    const ref = payload?.ref;

    if (ref !== `refs/heads/${targetBranch}`) {
      return res.status(200).send(`Ignored branch ${ref}`);
    }

    // Run deploy script
    const script = process.platform === "win32" ? "deploy.ps1" : "deploy.sh";
    const cmd = process.platform === "win32" ? "powershell.exe" : "bash";

    const args =
      process.platform === "win32"
        ? ["-ExecutionPolicy", "Bypass", "-File", script]
        : [script];

    const child = spawn(cmd, args, {
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) console.log("Deploy OK");
      else console.error("Deploy failed", code);
    });

    res.status(200).send("Deploy triggered");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

const port = Number(process.env.WEBHOOK_PORT || 9000);

app.listen(port, () => {
  console.log(`Webhook running on http://localhost:${port}`);
});