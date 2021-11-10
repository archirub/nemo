#!/bin/sh

echo 'If this is your first time running source map explorer, say yes (y) to every option.'

echo ''

echo 'Install package? (y - install/anything else - already installed)'

read answer

if [ $answer = 'y' ]
then
        sudo npm i -g source-map-explorer
fi

echo 'Add to configurations node? (y/anything else)'

read answer

if [ $answer = 'y' ]
then
	python sourceMapConfig.py
fi

echo 'Building and running source map...'

ionic build --prod

source-map-explorer www/main*.js
