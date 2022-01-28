#!/bin/sh

cd ios/App

pod install --repo-update

cd ../..

echo 'Dependencies should now be updated!'
