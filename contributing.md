# Development guid

## How to run locally

Please make sure you have installed `docker` and `docker-compose` locally. \
Then go to project root and run:
~~~
docker-compose build
docker-compose up -d
~~~
If the commands finish successfully the development server run.\
Navigate to http://localhost:8080. For first run you should see the 404 error vuepress page.

## How to build pages for vuepress

Please make sure you have places repo with books. Then copy & rename `.env.dist` and specify path to books using `PATH_TO_BOOKS` variable.\
As en example the path in `.env.dist` points to test fixtures. \
Then run:
~~~
docker-compose exec nodejs node index.js
~~~
Check http://localhost:8080 after that, it should be updated.