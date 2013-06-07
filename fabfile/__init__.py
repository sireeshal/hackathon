from fabric.api import *
from fabric.context_managers import *
from fabric.operations import *
from fabric.utils import abort
from fabric.colors import *
from fabric.contrib.files import upload_template
import os
import node
import datetime
import time

if os.path.isdir(os.path.join(os.path.dirname(__file__),'../../awsdeploy_python_module')):
  sys.path.append(os.path.join(os.path.dirname(__file__),'../../awsdeploy_python_module'))
  import awsdeploy

env.user = 'ubuntu'

# use a global for the tarFile name, not sure if this is the best way to do this...
# and a flag
tarFile = 'toolbar.tgz'
tmpTarFile = '/tmp/'+tarFile

@task
def deploy(rootDir='/opt/toolbar',projectRoot=None, defaultsFile=None, packageFile=None):
  """put files on server"""
  if not projectRoot:
    projectRoot = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
  if not packageFile:
    packageFile = projectRoot + '/package/' + tarFile
  print 'package file ' + packageFile
  put(packageFile, '/tmp/'+tarFile, use_sudo=True)
  sudo('chown -R appuser:appuser /tmp/'+tarFile)
  stop()
  sudo('rm -rf '+rootDir)
  sudo('mkdir -p '+rootDir)
  sudo('chown -R appuser:appuser '+rootDir)
  sudo('mv /tmp/'+tarFile+' '+rootDir+'/'+tarFile)
  sudo('su - appuser -c "cd '+rootDir+'; tar xf '+tarFile+'"')
  sudo('su - appuser -c "cd '+rootDir+'; rm '+tarFile+'"')
  sudo('sudo apt-get install make')
  sudo('su - appuser -c "cd '+rootDir+'/app; "')
  sudo('chown -R appuser:appuser '+rootDir)

  install_upstart(rootDir, defaultsFile)
  start()
  run('status toolbar')

@task
def create_instance_and_deploy(version=None, az=None, count=None,rootDir=None,projectRoot=None, defaultsFile=None, packageFile=None, size='m1.large'):
  iplist = awsdeploy.aws.app_deploy_generic('gtoolbar', version, az, count, 'nodejs', size)
  print iplist
  execute(deploy, rootDir, projectRoot, defaultsFile, packageFile, hosts=iplist)

@task
def package(projectRoot=None, nodeDistUrlRoot=None):
  if not projectRoot:
    projectRoot = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
  if not nodeDistUrlRoot:
    nodeDistUrlRoot = ""
  print 'echo Packaging...'
  local('cd '+projectRoot+'/build && ./package.sh')

@task
def bootstrap():
  """provision and configure server"""
  # pass
  node.install('v0.6.21')

@task
def install_upstart(rootDir='/opt/toolbar', defaultsFile=None):
  """deploy the upstart script"""

  if not defaultsFile:
    defaultsFile = os.path.join(os.path.dirname(__file__), 'files/defaults.sh')
  print 'echo defaultsFile ' + defaultsFile
  put(defaultsFile, '/etc/default/toolbar', use_sudo=True)

  sudo('chown root:root /etc/default/toolbar')
  sudo('echo "\nAPPDIR=\''+rootDir+'\'" >> /etc/default/toolbar')
  put(os.path.join(os.path.dirname(__file__), 'files', 'upstart.sh'), '/etc/init/toolbar.conf', use_sudo=True)
  sudo('chown root:root /etc/init/toolbar.conf')

@task
def start():
  """start service"""
  sudo('start toolbar')

@task
def stop():
  """stop service"""
  with settings(hide('warnings'),warn_only=True):
    sudo('stop toolbar')

@task
def restart():
  """restart service"""
  with settings(hide('warnings'),warn_only=True):
    sudo('restart toolbar')

@task
def tail():
  """tail logs"""
  run('tail -F /var/log/toolbar.log')
