description "Node.js server for Toolbar"

start on startup
start on [2345]
stop on [06]

env NODE_ENV=production
env CONFIG=ec2-config.js

pre-start script
  touch /var/log/toolbar.log
  chown appuser:appuser /var/log/toolbar.log
end script

respawn
respawn limit 50 5

script
  ulimit -n 99999
  . /etc/default/toolbar
  # echo "PORT_AUTHORITY_HOST: $PORT_AUTHORITY_HOST" >> /var/log/aqueduct.log 2>&1
  # echo "app dir: $APPDIR" >> /var/log/aqueduct.log 2>&1
  #su - appuser -c "cd $APPDIR/app; source /etc/default/toolbar; source /etc/app.env; export PATH=../nodejs/bin:$PATH; node server.js >> /var/log/toolbar.log 2>&1"
  su - appuser -c "cd $APPDIR/app; source /etc/default/toolbar; source /etc/app.env; node server.js >> /var/log/toolbar.log 2>&1"
end script