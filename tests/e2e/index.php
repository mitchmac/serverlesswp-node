<?php

http_response_code(301);
setcookie("cookie1", "test", time() + (86400 * 30), "/");
setcookie("cookie2", "test", time() + (86400 * 30), "/");

echo 'hello';