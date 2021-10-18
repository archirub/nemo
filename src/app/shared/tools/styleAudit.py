import os
import sys
import re
import time

def removeStyleComments(file):

    f = open(file, 'r')
    text = f.read()  #read in the text
    f.close()

    f = open(file, 'r')
    lines = f.readlines() #read in the lines to list
    
    singles = re.findall('[ \t]*//\s*.*[ \t]*\n', text) #single line // regex
    multiOpens = re.findall('[ \t]*/\*.*\n', text) #opening line /* regex

    for comment in singles:
        try:
            lines.remove(comment) #Removes single line // comments
        except ValueError:
            pass
    for opening in multiOpens:
        if '*/' in opening:
            try:
                lines.remove(opening) #Removes single line /* */ comments
            except ValueError:
                pass
        else: 
            start = lines.index(opening)
            close = lines.index(opening) + 1
            while '*/' not in lines[close]: #build multiline comment until */ is found
                close += 1
            
            lines = lines[:start] + lines[close+1:]

    f.close()

    return ''.join(lines)

def removeHTMLComments(file):

    f = open(file, 'r')
    text = f.read()
    f.close()

    f = open(file, 'r')
    lines = f.readlines()

    singles = re.findall('[ \t]*<!--\s*.*\s*-->\n', text) #single line <!-- --> regex
    multiOpens = re.findall('[ \t]*<!--\s*.*\n', text) #opening line <!-- regex

    for comment in singles:
        lines.remove(comment) #Removes single line <!-- --> comments
    for opening in multiOpens:
        try:
            start = lines.index(opening)
            close = lines.index(opening) + 1
            while '-->' not in lines[close]: #build multiline comment until --> is found
                close += 1
            
            lines = lines[:start] + lines[close+1:]
        except ValueError: #If it gets to this stage, the single line comment has been picked up also as a multiline meaning it's already removed
            pass

    f.close()

    return ''.join(lines)

def styleParser(scrape):

    selector = [] #Will always return a list even if one selector

    #If multiple selectors, split them up
    if ',' in scrape:

        while ',' in scrape:
            next = scrape.find(',')
            selector.append(scrape[:next])
            scrape = scrape[next+1:]
        
        selector.append(scrape) #Append final style in list

    else:
        selector = [scrape]

    #Process of swapping # for ID, . for class, etc
    processed = []

    for s in selector:
        if s[0] == '&':
            s = s[1:] #Remove subclass tokens
        
        if ('.' in s) or ('#' in s):
            while '.' in s:
                next = s.rfind('.') #Start from end and find last occurrence
                processed.append((s[next+1:], 'class'))
                s = s[:next]
            while '#' in s:
                next = s.rfind('#')
                processed.append((s[next+1:], 'ID'))
                s = s[:next]
        else:
            processed.append((s, 'tag')) #HTML tag selector, not class or ID
            continue

        if len(s) > 0:
            processed.append((s, 'tag')) #Catch any other selectors missed at the start of layered classes/IDs

    return processed

def rewriteStyle(selectorAndType):

    name = selectorAndType[0]
    selectorType = selectorAndType[1]

    map = {
        'class': '.',
        'ID': '#',
        'tag': ''
    }

    return map[selectorType]+name


#Search for css or scss, enter extension of choice
styleExtension = 'scss'

print('This relies on your code having a clean structure. If it\'s a mess, use Prettier or have some self respect :)\n')
print('This script is set to look for {0} files'.format(styleExtension))
print('If this is not desired change the script.')
print('\nThere is also a dictionary of stylenames or tags or any selectors that are to be ignored. For example, -webkit-scrollbar is generally ignored.')
print('Add to this if you so wish!')

dom = str(input('\nHTML filename: '))
style = str(input('CSS filename (if same as HTML just hit enter): '))

if style == "":
    style = dom[:dom.find('.html')] + '.{0}'.format(styleExtension)

print('\nHTML:', dom)
print('CSS:', style, '\n')

#Scan through css, compile ID/class list
styleList = []

try:
    temp = open('styleCommentsRemoved.{0}'.format(styleExtension), 'x') #create temporary file for text without comments
    temp.write(removeStyleComments(style))
    temp.close()

    reader = open('styleCommentsRemoved.{0}'.format(styleExtension), 'r')
    text = reader.readlines()
    i = 0
    while i < len(text):
        line = text[i].replace(" ", "")
        line = line.replace("\n", "")

        if ('{' in line) and (len(line) > 1):
            selector = line[:line.find('{')]
            #print(selector)
            styleList.append(selector)

        elif ('{' in line) and (len(line) == 1):
            selector = text[i-1][:text[i-1].find('\n')]
            #print('(STYLE ON PREVIOUS LINE)',selector)
            styleList.append(selector)
        
        i += 1
    
    reader.close()

except FileNotFoundError:
    print('CSS File not found, abandoning...')
    sys.exit() #End program

os.remove('styleCommentsRemoved.{0}'.format(styleExtension)) #delete temporary file


#Scan through HTML, if selector not found in DOM add to absent list
stylesAbsent = []

try:
    temp = open('htmlCommentsRemoved.html', 'x') #Temporary html with comments parsed out
    temp.write(removeHTMLComments(dom))
    temp.close()

    reader = open('htmlCommentsRemoved.html', 'r')
    text = reader.read()

    stylesProcessed = []
    print('FULL STYLE LIST (parsed):\n')
    time.sleep(0.5)

    for s in styleList:
        stylesProcessed += styleParser(s)

    for s in stylesProcessed:
        print(s)
        if text.find(s[0]) == -1:
            stylesAbsent.append(s)
    
    print("\n")

    for s in stylesAbsent:
        print("ABSENT FROM DOM:", s)

    reader.close()

except FileNotFoundError:
    print('HTML File not found, abandoning...')
    sys.exit() #End program

os.remove('htmlCommentsRemoved.html') #delete temp file
print('')



#Now we can remove the styles from the stylesheet
newStyleName = 'newStyle.{0}'.format(styleExtension)

holding = True #Hold and ask for a filename until not found in local dir (i.e. prohibits file overwrites)
while holding:
    if os.path.exists(newStyleName) == True:
        print('\nThe name of the new file was going to be \'{0}\', but this is already used.'.format(newStyleName))
        newStyleName = str(input('Please choose a name for the new trimmed stylesheet, do not include the file extension: ')) + '.{0}'.format(styleExtension)
        continue
    else:
        holding = False

original = open(style)
lines = original.readlines()

i = 0
while i < len(lines):
    current = lines[i]

    if any(rewriteStyle(s) in current for s in stylesAbsent): 
        print("Line: {0}".format(current))

        j = i+1
        while '}' not in lines[j]:
            j += 1
        
        print('Opened at {0}, closed at {1}'.format(i,j))
        print('LINE REMOVED\n')

        lines = lines[:i] + lines[j+1:]

    i += 1

toWrite = ''.join(lines)

new = open(newStyleName, 'x') #create new style file with unused selectors removed
new.write(toWrite)
new.close()

print('\nThe newly trimmed stylesheet has been saved in the local dir as \'{0}\'.'.format(newStyleName))
print('If no statements appear above saying \'LINE REMOVED\', nothing has been changed, and you can delete {0}.'.format(newStyleName))
print('We recommend comparing them side-by-side to check for any parsing errors.')
print('The old stylesheet, {0}, has not been deleted.'.format(style))

