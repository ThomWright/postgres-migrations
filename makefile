publish:
	@printf "\033[0;32m>>> Publish pakages033[0m\n"
	npx shipjs trigger

release:
	@printf "\033[0;32m>>> Prepare packages for release033[0m\n"
	npx shipjs prepare
