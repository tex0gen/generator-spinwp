'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const mysql = require('mysql2');
const ncp = require('ncp').ncp;
const open = require('open');

let user = null;
let orgs = [];
let prechecks = false;
const plugins = [
  'wordfence',
]

module.exports = class extends Generator {
  async _private_method_checkInstalls() {
    const commands = {
      'mysql': 'mysql --version',
      'php': 'php --version',
      'wp-cli': 'wp --info',
      'gh-cli': 'gh --version',
    };
    let i = 1;
    const keyNum = Object.keys(commands).length;

    if (process.versions.node > 14) {
      console.error('Error: Node version is too low. Please update to v16.x or higher.');
      process.exit();
    }

    return new Promise((resolve) => {
      Object.keys(commands).map(key => {
        exec(commands[key], (stderr, stdout) => {
          if (stderr) {
            console.error(chalk.red('Error: ' + key + ' is not installed.'));

            if (key === 'gh') {
              open('https://cli.github.com/');
            }

            if (key === 'wp-cli') {
              open('https://wp-cli.org/');
            }

            process.exit();
          } else {
            console.log(chalk.green('Success: ' + key + ' is installed.'));
          }

          if (keyNum === i) {
            resolve('resolved');
          }

          i++;
        })
      });
    });
  }

  async _private_method_checkGitConfig() {
    return new Promise((resolve) => {
      exec('gh api \-H "Accept: application/vnd.github+json" \/user', (stderr, stdout) => {
        if (stderr) {
          console.error(chalk.red('Error: Git config is not set.'));
          process.exit();
        } else {
          if (stdout) {
            user = JSON.parse(stdout);
            resolve('resolved');
            // This is for when organisations exist...
            // exec('gh api \-H "Accept: application/vnd.github+json" \/users/' + username + '/orgs', (stderr, stdout) => {
            //   if (!stderr) {
            //     let response = JSON.parse(stdout);
            //     console.log(response);
            //     response;
            //   }

            //   resolve('resolved');
            // });
          }
        }
      });
    });
  }

  async initializing() {
    if (prechecks === false) {
      await this._private_method_checkInstalls();
      await this._private_method_checkGitConfig();
      prechecks = false;
    }
  }

  prompting() {
    const prompts = [
      {
        type: 'input',
        name: 'name',
        message: 'Project Name (no spaces)'
      },
      {
        type: 'input',
        name: 'dbuser',
        message: 'Database username',
        default: 'root'
      },
      {
        type: 'input',
        name: 'dbpass',
        message: 'Database password',
        default: '',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email Address',
        default: user.email,
      },
      {
        type: 'input',
        name: 'wpuser',
        message: 'Wordpress Username',
        default: user.login,
      },
      {
        type: 'input',
        name: 'wppass',
        message: 'Wordpress Password',
      },
      {
        type: 'confirm',
        name: 'themeinstall',
        message: 'Pull starter theme?'
      },
      {
        type: 'confirm',
        name: 'gitinit',
        message: 'Create Git Repo?'
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = props;
      if (this.props.wpuser === "admin" || this.props.wpuser === "administrator") {
        console.log(chalk.red('Consider your WordPress install hacked. NEVER use ADMIN or ADMINISTRATOR as a username.'));
        process.exit();
      }
    });
  }

  writing() {}

  async _private_method_wpDownload(projectPath) {
    console.log('Downloading Wordpress..');
    return new Promise((resolve) => {
      exec('wp core download --path=' + projectPath)
        .then(() => {
          console.log(chalk.green('WordPress Downloaded!'));
          resolve('resolved');
        }).catch((err) => {
          console.log(chalk.red('WordPress could not downloaded.', err));
          process.exit();
        });
      });
  }

  async _private_method_createDb(dbuser, dbpass, thePath) {
    console.log('Creating Database..');

    const con = await mysql.createConnection({
      host: 'localhost',
      user: dbuser,
      password: dbpass
    });

    const dbcreate = await con.execute('CREATE DATABASE wp_wordpress_' + thePath);

    if (dbcreate) {
      console.log(chalk.green('Database created!'));
      return true;
    } else {
      console.log(chalk.red('Database could not be created: ', err));
      return false;
    }
  }

  async _private_method_wpInstall(dbuser, dbpass, projectPath, thePath, email, wpuser, wppass) {
    console.log('Installing WordPress..');
    return new Promise((resolve) => {
      exec(
        'wp config create --path=' + projectPath +
        ' --dbname=wp_wordpress_' + thePath +
        ' --dbuser=' + dbuser +
        ' --dbpass=' + dbpass +
        ' --dbhost="127.0.0.1"',
        (stderr, stdout) => {
          if (stderr) {
            console.error(chalk.red('Error: WordPress could not be installed.'));
            process.exit();
          } else {
            return new Promise((res) => {
              exec(
                'wp core install --path=' + projectPath +
                ' --url=http://localhost/' + thePath +
                ' --title=' + thePath +
                ' --admin_user=' + wpuser +
                ' --admin_password=' + wppass +
                ' --admin_email=' + email,
                (stderr, stdout) => {
                  if (stderr) {
                    console.error(chalk.red('ffff: WordPress could not be installed.'));
                    process.exit();
                  } else {
                    console.log(chalk.green('WordPress Installed!'));
                    res('resolved');
                    resolve('resolved');
                  }
                }
              );
            });
          }
      });
    });
  }

  async _private_method_wpInstallPlugins(thePath, projectPath) {
    console.log('Installing Plugins..');
    const plugins_dir = __dirname + '/plugins';
    return new Promise((res) => {
      ncp(
        plugins_dir,
        process.cwd() + '/' + thePath + '/wp-content/plugins',
        function(err) {
          if (err) {
            console.log(chalk.red('Error moving plugins', err));
            return false;
          }
        }
      );

      return new Promise((resolve) => {
        let pluginList;
        plugins.forEach(element => {
          pluginList += element + " ";
        });
        exec('wp plugin install ' + pluginList + ' --path=' + projectPath, (stderr, stdout) => {
          return new Promise((r) => {
            exec('wp plugin activate --all --path=' + projectPath, (stderr, stdout) => {
              console.log(chalk.green('Plugins Installed'));
              r('resolved');
              resolve('resolved');
              res('resolved');
            });
          });
        });
      });
    });
  }

  _private_method_wpInstallTheme(parentTheme, parentPath, thePath, projectPath) {
    console.log('Installing Starter Theme..');
    return new Promise((res) => {
      exec(
        'gh repo clone ' +
          parentTheme +
          ' ' +
          parentPath,
          (stderr, stdout) => {
            return new Promise((r) => {
              exec('wp theme activate wp-' + thePath + ' --path=' + projectPath, (stderr, stdout) => {
                console.log(chalk.green('Theme installed.'));
                r('resolved');
                res('resolved');
                return true;
              });
            });
          }
      );
    });
  }

  async _private_method_wpAddRepo(thePath, parentPath) {
    console.log('Creating Git Repo..');
    return new Promise((resolve) => {
      exec('gh repo create wp-' + thePath + ' --private', (stderr, stdout) => {
        if (stderr) {
          console.error(chalk.red('Error: Git config is not set.'));
          process.exit();
        } else {
          return new Promise((resolved) => {
            exec('cd ' + parentPath + ' && git remote remove origin && git remote add origin git@github.com:' + user.login + '/wp-' + thePath + '.git', (stderr, stdout) => {
              return new Promise((r) => {
                // const webhookData = {
                //   "active": true,
                //   "events": [
                //     "push"
                //   ],
                //   "config": {
                //     "url": "https://YOURURL.COM",
                //     "secret": "YOUR_SECRET",
                //     "content_type": "json"
                //   }
                // };

                const webhookData = {};

                exec('gh api /repos/'+user.login+'/wp-' + thePath + '/hooks \ --input - <<< \'' + JSON.stringify(webhookData) + '\'', (stderr, stdout) => {
                  console.log(chalk.green('Git Repo Created.'));
                  open('https://github.com/' + user.login +'/wp-' + thePath);
                  resolve('resolved');
                  r('resolved');
                });
             });
           });
          });
        }
      });
    });
  }

  async install() {
    let projectPath = process.cwd() + '/' + this.props.name,
      thePath = this.props.name,
      dbuser = this.props.dbuser,
      dbpass = this.props.dbpass,
      email = this.props.email,
      wpuser = this.props.wpuser,
      wppass = this.props.wppass,
      pullTheme = this.props.themeinstall,
      gitRepo = this.props.themeinstall;

    const parentTheme = 'https://github.com/tex0gen/bootstrap5-wordpress-theme'; // REPLACE THIS WITH YOUR GIT REPO
    const parentPath = projectPath + '/wp-content/themes/wp-' + thePath;

    // Execute Actions
    const wpDownload = await this._private_method_wpDownload(projectPath);
    // console.log(wpDownload);
    const createDb = (wpDownload) && await this._private_method_createDb(dbuser, dbpass, thePath);
    // console.log(createDb);
    const wpInstall = (createDb) && await this._private_method_wpInstall(dbuser, dbpass, projectPath, thePath, email, wpuser, wppass);
    // console.log(wpInstall);
    const wpInstallPlugins = (wpInstall) && await this._private_method_wpInstallPlugins(thePath, projectPath);

    if (pullTheme) {
      const wpInstallTheme = (wpInstallPlugins) && await this._private_method_wpInstallTheme(parentTheme, parentPath, thePath, projectPath);
    }

    if (gitRepo) {
      const wpAddRepo = (wpInstallPlugins) && await this._private_method_wpAddRepo(thePath, parentPath);
      console.log(chalk.yellow('Spinning up on staging is done on first push of project.'));
    }

    exec('cd ' + parentPath + ' && npm install', (stderr, stdout) => {
      if (stderr) {
        console.error(chalk.red('Error: NPM Modules could not be installed. Install manually.'));
        process.exit();
      } else {
        console.log(chalk.green('NPM Modules Installed!'));
      }
    });

    console.log(chalk.green('All Done!'));
    open('http://localhost/' + thePath + '/wp-admin');
    process.exit();
  }
};
