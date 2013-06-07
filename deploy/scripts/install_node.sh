#!/bin/bash

if [ -z "$1" -o -z "$2" ]; then
	echo "usage: $0 <NODE_VERSION> <NPM_VERSION>"
	exit 1
fi

PREVPWD=`pwd`

NODE_VERSION="$1"
NPM_VERSION="$2"




# with npm we're more concerned with maintaining a minimum version so only
# install or upgrade if the current version is less than the one specified

# install npm #################################################################
if [ `hash npm 2>&- || echo 'missing'` eq "missing" -a `npm --version` lt $NPM_VERSION ]; then

    cd /opt

    if [ ! -d "/opt/npm" ]; then
    	git clone http://github.com/isaacs/npm.git
    fi

    cd npm
    git pull origin master
    git checkout $NPM_VERSION
    sudo make install
else
    echo "$NPM_VERSION of npm is already installed. SKIPPING"
fi

cd $PREVPWD

# use nvm to manage multiple version of node for us
. /opt/nvm/nvm.sh
nvm install "v$NODE_VERSION"
nvm use "v$NODE_VERSION"
