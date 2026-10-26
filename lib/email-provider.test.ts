import assert from "node:assert/strict";
import test from "node:test";

test("email module can be imported without optional Resend credentials", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  try {
    delete process.env.RESEND_API_KEY;

    const emailModule = await import("./email");

    assert.equal(typeof emailModule.sendEmail, "function");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});

test("sendEmail without Resend credentials reports not-configured instead of a fake delivery", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalLog = console.log;

  try {
    delete process.env.RESEND_API_KEY;
    console.log = () => {};

    const { sendEmail } = await import("./email");
    const result = await sendEmail({ to: "alex@example.test", subject: "Hello", html: "<p>Hello</p>" });

    assert.deepEqual(result, { status: "not-configured" });
  } finally {
    console.log = originalLog;
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});
