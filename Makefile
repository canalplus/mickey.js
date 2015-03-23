SRC = $(shell find src  -name "*.js" -type f | sort)
SRC_IDX = src/mickey.js
BUNDLE ?= node "node_modules/webpack/bin/webpack.js" --progress

all: dist/mickey.js dist/mickey.map.js dist/mickey.min.js

build: dist/mickey.js

map: dist/mickey.map.js

min: dist/mickey.min.js

clean:
	@rm -f dist/mickey.js
	@rm -f dist/mickey.min.js
	@rm -f dist/mickey.map.js
	@rm -f dist/mickey.map.js.map

lint:
	@jshint --config .jshintrc $(SRC)

dist/mickey.js: $(SRC_IDX) $(SRC)
	@$(BUNDLE) --optimize-occurence-order $< $@

dist/mickey.map.js: $(SRC_IDX) $(SRC)
	@$(BUNDLE) --optimize-occurence-order --devtool source-map $< $@

dist/mickey.min.js: $(SRC_IDX) $(SRC)
	@$(BUNDLE) -p $< $@

.PHONY: build min clean lint
