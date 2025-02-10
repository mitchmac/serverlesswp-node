FROM public.ecr.aws/lambda/nodejs:22

COPY temp/package.json temp/package-lock.json ${LAMBDA_TASK_ROOT}/
RUN npm config set update-notifier false
RUN npm install --omit=optional --omit=dev --verbose

COPY temp/src ${LAMBDA_TASK_ROOT}/src
COPY temp/php-files ${LAMBDA_TASK_ROOT}/php-files
COPY temp/index.php ${LAMBDA_TASK_ROOT}/wp/
COPY temp/static.css ${LAMBDA_TASK_ROOT}/wp/
COPY router.php ${LAMBDA_TASK_ROOT}/
COPY test.js ${LAMBDA_TASK_ROOT}/

CMD [ "test.handler" ]