#!/bin/bash

echo "___.         .__.__       .___.__                "
echo "\_ |__  __ __|__|  |    __| _/|__| ____    ____  "
echo " | __ \|  |  \  |  |   / __ | |  |/    \  / ___\ "
echo " | \_\ \  |  /  |  |__/ /_/ | |  |   |  \/ /_/  >"
echo " |___  /____/|__|____/\____ | |__|___|  /\___  / "
echo "     \/                    \/         \//_____/  "
echo "  __                .__ ___.                     "
echo "_/  |_  ____   ____ |  |\_ |__ _____ _______     "
echo "\   __\/  _ \ /  _ \|  | | __ \\__  \\_  __ \    "
echo " |  | (  <_> |  <_> )  |_| \_\ \/ __ \|  | \/    "
echo " |__|  \____/ \____/|____/___  (____  /__|       "
echo "                             \/     \/           "
echo "   _________________                               "
echo "  /  __________    //\_                            "
echo " |  (__________)  ||.'  -._________________________ "
echo " |    __________  || ._.-'~~~~~~~~~~~~~~~~~~~~~~~~/ "
echo "  \__(__________)__\\/  "
echo ""


ORIG_DIR=`pwd`
echo "Go Go Dojo Build..."

# get the version number from the package.json
#VERSION=`cat ../package.json | sed -e 's/[{}]/''/g' | awk -v RS=',"' -F: '/version/ {print $2}' | awk '{gsub(/[ \t\"]+/, ""); print}'`
VERSION=cache-`git rev-parse HEAD | cut -c 1-8`
JUST_VERSION=`git rev-parse HEAD | cut -c 1-8`
echo "VERSION $VERSION"
echo "JUST_VERSION $JUST_VERSION"
./build.sh $VERSION
cd $ORIG_DIR

echo "Copying other resources..."
cd ..
mkdir -p dist/app/public
cp -R public/js/*.js public/js/ecollege public/js/mustache dist/app/public/js/
cp -R public/*.html public/style public/images dist/app/public/
cp -Rp app.js *.json server.js docs lib routes package.json node_modules dist/app/
cp -R deploy dist/deploy

# install all of the NPM dependencies locally into the dist folder, into node_modules
echo "Installing NPM dependencies"
cd dist/app
npm install --production

cd node_modules
find . -name ".bin" | xargs rm -rf

# clean-up un-needed dojo built resources
cd ../public/js/$VERSION
rm -rf dijit dojo dojox

cd $ORIG_DIR

# VERSION injection
cd ..
sed -e "s|{VERSION}|$VERSION|g" dist/app/public/js/include-toolbar.js > dist/app/public/js/include-toolbar.tmp
mv dist/app/public/js/include-toolbar.tmp dist/app/public/js/include-toolbar.js

echo "You package has been deliveryed to /dist - congratulations!"

cd dist
rm -rf ../package
mkdir -p ../package

tar -pczf ../package/toolbar.tgz app

# write out STAMP and VERSION files
#ME=`git config  user.name`

#if [ -z "$ME" ]; then
#	ME=`whoami`
#fi

echo "Built by $ME at `date` on `hostname` with git version `git rev-parse HEAD`" > ../package/STAMP
echo $JUST_VERSION > ../package/VERSION

echo "A Zip package has been deliveryed to /package/toolbar-$JUST_VERSION!"

cd $ORIG_DIR
