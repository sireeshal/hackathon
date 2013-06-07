#!/bin/bash

# TODO check if node exists, else error
if [ -z "`which node`" ]; then
	echo "node is not on the path!!!! BYE :("
	exit 1
fi

if [ -z "`which npm`" ]; then
	echo "npm is not on the path!!!! BYE :("
	exit 1
fi

. "`dirname $0`/always_included.sh"

run_template "$toolbar_dir/deploy/templates/upstart.conf.template" "/etc/init/toolbar.conf"

PREVPWD=`pwd`

# unpack the zip
VERSION=`cat $toolbar_dir/VERSION`
unzip -q -d $toolbar_dir $toolbar_dir/toolbar-$VERSION.zip
rm $toolbar_dir/toolbar-$VERSION.zip
 
cd $PREVPWD

sudo mkdir -vp "$LOGGING_DIRECTORY"