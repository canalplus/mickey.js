SRC = $(shell find src  -name "*.js" -type f | sort)
SRC_IDX = src/mickey.js
BUNDLE ?= node "node_modules/webpack/bin/webpack.js" --progress

all: dist/mickey.js dist/mickey.min.js

build: dist/mickey.js

min: dist/mickey.min.js

clean:
	@rm -f dist/mickey.js
	@rm -f dist/mickey.min.js

lint:
	@jshint --config .jshintrc $(SRC)

dist/mickey.js: $(SRC_IDX) $(SRC)
	@$(BUNDLE) $< $@

dist/mickey.min.js: $(SRC_IDX) $(SRC)
	@$(BUNDLE) -p $< $@

.PHONY: build min clean lint
