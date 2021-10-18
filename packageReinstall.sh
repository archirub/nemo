#!/bin/sh

sudo rm -r node_modules || echo 'No node_modules dir found, moving to delete package-lock.json...'
sudo rm package-lock.json || echo 'No package-lock.json found, moving to install node...'

echo 'Running npm install with --legacy-peer-deps...'
npm install --legacy-peer-deps

echo 'Do you want to install typescript 4.3 (yes), or is your Node up to date like a normal human being (literally anything else)?'

read answer

if [ $answer = 'yes' ]
then
	npm install typescript@4.3
fi

echo 'Your packages should now be up to date! :)'
