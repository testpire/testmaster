export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "www.topperloop.com";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  },
};
