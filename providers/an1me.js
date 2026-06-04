module.exports = {
  getStreams: function(tmdbId, mediaType, season, episode) {
    return Promise.resolve([{
      name: "An1me Test",
      title: "Working",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      quality: "1080p",
      headers: {}
    }]);
  }
};