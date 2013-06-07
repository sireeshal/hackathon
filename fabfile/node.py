from fabric.api import *
from fabric.context_managers import *
from fabric.operations import *
from fabric.utils import abort
from fabric.colors import *
import os

@task
def install_user(version):
  """install in user's home under 'local' folder"""
  with settings(hide('warnings'),warn_only=True):
    iffer = run('test -d ~/local')
    if iffer.failed:
      run('mkdir ~/local')
      run("echo 'export PATH=$HOME/local/bin:${PATH}' >> ~/.profile")
    iffer = run('test -d ~/src')
    if iffer.failed:
      run('git clone https://github.com/joyent/node.git ~/src')
      current = run('node -v')
      if current.succeeded:
        iffer = run('test "'+version+'" = "'+current+'"')
      if current.failed or iffer.failed:
        with cd('~/src'):
          run('git reset --hard')
          run('git pull')
          run('git checkout '+version)
          # run('./configure --with-dtrace --prefix=~/local')
          # run('gmake install')
          run('./configure --prefix=~/local')
          run('make install')

@task
def install_global(version):
  """install node in /usr"""
  with settings(hide('warnings'),warn_only=True):
    if run('test -d ~/src').failed:
      run('git clone https://github.com/joyent/node.git ~/src')
    current = run('node -v')
    if current.succeeded:
      iffer = run('test "'+version+'" = "'+current+'"')
    if current.failed or iffer.failed:
      with cd('~/src'):
        run('git reset --hard')
        run('git pull')
        run('git checkout '+version)
        run('./configure --prefix=/usr')
        run('make')
        sudo('make install')

@task
def install_opt(version='0.6.21'):
  """install node in /opt/node"""
  # don't want v in version for comparisons
  if version.startswith('v'):
    version = version.lstrip('v')
  with settings(hide('warnings'),warn_only=True):
    if run('test -d ~/src').failed:
      run('git clone https://github.com/joyent/node.git ~/src')
    current = run('node -v')
    if current.succeeded:
      iffer = run('test "'+version+'" = "'+current+'"')
    if current.failed or iffer.failed:
      if run('test -d /opt/node').succeeded:
        sudo('rm -rf /opt/node')
      with cd('~/src'):
        run('make clean')
        run('git reset --hard')
        run('git fetch origin')
        # DO want v in version for tag checkout
        run('git checkout v'+version)
        run('./configure --prefix=/opt/node')
        run('make')
        sudo('mkdir -p /opt/node')
        sudo('make install')
    if run('test -f /etc/profile.d/node-opt.sh').failed:
      put( os.path.join(os.path.dirname(__file__), 'files', 'node-opt.sh'), '/etc/profile.d/node-opt.sh', use_sudo=True)
      sudo('chown root:root /etc/profile.d/node-opt.sh')
      sudo('chmod +x /etc/profile.d/node-opt.sh')

@task
def install(version='0.6.21'):
  """install node in /usr/local"""
  # don't want v in version for comparisons
  if version.startswith('v'):
    version = version.lstrip('v')
  with settings(hide('warnings'),warn_only=True):
    if run('test -d ~/src').failed:
      run('git clone https://github.com/joyent/node.git ~/src')
    current = run('node -v')
    if current.succeeded:
      iffer = run('test "'+version+'" = "'+current+'"')
    if current.failed or iffer.failed:
      with cd('~/src'):
        run('git reset --hard')
        run('git fetch origin')
        # we DO want v in version for tag checkout
        run('git checkout v'+version)
        run('./configure')
        run('make')
        sudo('make install')

@task
def install_n():
  """install 'n' (as global npm package)"""
  sudo('npm install -g git://github.com/mbrevoort/n.git#b59aa5a6d1')

@task
def n_user():
  """set 'n' to direct to node.js installed in user's 'local' folder"""
  if run('test -z "$N_PREFIX"').succeeded:
    run("echo 'export N_PREFIX=~/local' >> ~/.bashrc")
