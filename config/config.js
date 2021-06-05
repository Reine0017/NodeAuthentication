const config = {
  production: {
  },
  default: {
    PERSIST_LOGIN_SECRET: "<PERSIST_LOGIN_SECRET>",
    RESET_PASSWORD_KEY: "<RESET_PASSWORD_KEY>",
    DATABASE:
      "<API_KEY_HERE>",
    SENDGRID_API_KEY:
      "<API_KEY_HERE>",
    CLIENT_URL: "http://<YOUR_IP>:3000",
    ACTIVATION_SECRET: "<ACTIVATION_SECRET>",
  },
};

exports.get = function get(env) {
  return config[env] || config.default;
};