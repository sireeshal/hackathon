test-unit:
	./node_modules/mocha/bin/mocha --ignore-leaks test/unit/*

test-jenkins:
	./node_modules/mocha/bin/mocha -R tap --ignore-leaks test/unit/*

install:
	npm install .

package: 
	cd build && ./package.sh

clean:
	rm -rf dist package widgets/dist

docs:
	./node_modules/.bin/docco-husky  -name "OpenClass Toolbar" *.js lib public/js

.PHONY: package docs
