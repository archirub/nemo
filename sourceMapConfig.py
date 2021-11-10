import json

reader = open('angular.json', 'r')

#Load json, read to configurations under build
data = json.loads(reader.read())
tree = data['projects']['app']['architect']['build']['configurations']

#Set necessary configurations
tree['sourceMap'] = True
tree['namedChunks'] = True

#indent adds tabs and newlines
out = json.dumps(data, indent=2)

reader.close()

#Open for writing
writer = open('angular.json', 'w')

writer.write(out)

writer.close()

print('angular.json successfully written')