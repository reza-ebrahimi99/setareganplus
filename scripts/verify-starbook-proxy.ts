import { NextRequest } from "next/server";
import { proxy } from "../proxy";

function check(path: string, host: string) {
  const req = new NextRequest(new URL(path, "http://127.0.0.1:3030"), {
    headers: { host },
  });
  const res = proxy(req) as Response;
  console.log(
    JSON.stringify({
      path,
      host,
      status: res.status,
      rewrite: res.headers.get("x-starbook-rewrite"),
      loc: res.headers.get("location"),
    }),
  );
}

check("/", "shop.setareganplus.ir");
check("/cart", "shop.setareganplus.ir");
check("/book/math-101", "shop.setareganplus.ir");
check("/account", "shop.setareganplus.ir");
check("/shop", "shop.setareganplus.ir");
check("/shop", "setareganplus.ir");
check("/", "setareganplus.ir");
check("/starbook", "setareganplus.ir");
