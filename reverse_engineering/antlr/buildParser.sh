#!/bin/bash

# * run with `sh buildParser.sh`

# !important: don't forget to change `import` and `export` to `require` and `module.exports` after the parser is built

# https://www.antlr.org/download/antlr-4.9.2-complete.jar
#
# set antlr4 aliases
# export CLASSPATH=".:/usr/local/lib/antlr-4.9.2-complete.jar:$CLASSPATH"
# alias antlr4='java -jar /usr/local/lib/antlr-4.9.2-complete.jar'
# alias grun='java org.antlr.v4.gui.TestRig'

# build parser
java -jar /usr/local/lib/antlr-4.9.2-complete.jar -Dlanguage=JavaScript \
    -lib grammars \
    -o parser/ \
    -visitor \
    -no-listener \
    -Xexact-output-dir \
    grammars/n1ql.g4

npx prettier --write ./parser/**/*.js
