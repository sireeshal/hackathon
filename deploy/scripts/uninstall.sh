#!/bin/bash

. "`dirname $0`/always_included.sh"

if [ -f /etc/init/toolbar.conf ]
then
  echo "An existing Toolbar installation was found, stopping..."
  trap "sudo stop toolbar" 0

  echo "Removing the existing Upstart service config file: /etc/init/toolbar.conf"
  sudo rm /etc/init/toolbar.conf
fi

if [ -d $toolbar_dir/app ]
then
  echo "Removing $toolbar_dir/app"
  sudo rm -rf $toolbar_dir/app
fi

if [ -d /var/log/toolbar ]
then
  echo "Cleaning up log directory /var/log/toolbar "
  sudo rm -rf /var/log/toolbar
fi

if [ -d /tmp/toolbar ]
then
  echo "Cleaning up tmp file descriptors directory /tmp/toolbar "
  sudo rm -rf /tmp/toolbar
fi

