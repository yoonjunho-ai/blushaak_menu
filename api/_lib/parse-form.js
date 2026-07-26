const { formidable } = require('formidable');

// Vercel Node functions don't auto-parse multipart/form-data, so callers
// that accept file uploads need this to read fields + files off the raw request.
async function parseForm(req, options = {}) {
  const form = formidable({ maxFileSize: 4 * 1024 * 1024, ...options });
  const [fields, files] = await form.parse(req);

  const flatFields = {};
  for (const key of Object.keys(fields)) {
    flatFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
  }

  const flatFiles = {};
  for (const key of Object.keys(files)) {
    flatFiles[key] = Array.isArray(files[key]) ? files[key][0] : files[key];
  }

  return { fields: flatFields, files: flatFiles };
}

module.exports = { parseForm };
