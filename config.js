var config = {};

config.redis = {
  host: 'nodejitsudb6098456080.redis.irstack.com',
  port: 6379,
  pass: 'nodejitsudb6098456080.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4'
};

config.google = {
  development: {
    passReqToCallback: true,
    clientID: '1013795292734-j1uinst243dmhkrbcsolnhh3rk914ufa.apps.googleusercontent.com',
    clientSecret: 'NQc-_TbMe0-KmbcSRKPTCtCb',
    callbackURL: 'http://127.0.0.1:3000/auth/google/return'
  },
  production: {
    passReqToCallback: true,
    clientID: '1013795292734.apps.googleusercontent.com',
    clientSecret: 'Ib-YUdtjWgiUqrFPpeGhFmnP',
    callbackURL: 'http://living-archives.nodejitsu.com/auth/google/return'
  }
};

config.mongo = 'mongodb://nodejitsu_bmcmahen:5kqpm14nbjk7vplkjsb0v8mka5@ds051977.mongolab.com:51977/nodejitsu_bmcmahen_nodejitsudb6683642989';

config.sendgrid = {
  user: 'bmcmahen',
  pass: 'dfgpxd'
};

config.domainName = {
  development: '127.0.0.1:3000',
  production: 'http://living-archives.nodejitsu.com'
};

module.exports = config;