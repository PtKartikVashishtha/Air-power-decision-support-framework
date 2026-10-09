.PHONY: all install build dev test benchmark demo docker-up

all: install build test

install:
	pnpm install

build:
	pnpm --recursive build

dev:
	pnpm run dev

test:
	pnpm run test

benchmark:
	pnpm run benchmark

demo:
	pnpm run dev

docker-up:
	docker compose up --build
