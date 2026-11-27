export default {
  transpilePackages:['@vercel/sandbox','@vercel/drives','@workflow/serde'],
  serverExternalPackages:['imapflow','nodemailer'],
  outputFileTracingIncludes:{
    '/api/*':['./lib/verify.py','./lib/browser.cjs'],
    '/api/agent-computer':['./lib/desktop-proxy.cjs','./lib/desktop-start.sh','./lib/desktop-job.sh']
  }
};
