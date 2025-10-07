async function main() {
    const { animate, onScroll } = await import("https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.esm.min.js")
    
    let effectItems = document.querySelectorAll("[data-anime-scroll-animation]");
    let skipKeys = "animeStart animeEnd animeSync".split(" ");
    
    for (let el of effectItems) {
        
        let effectOpts = {};

        for (let key in el.dataset) {
            if (!key.startsWith("anime") || skipKeys.includes(key)) {
                continue;
            }
            
            let val = el.dataset[key];
            
            key = key.replace("anime", "");
            key = key.slice(0,1).toLowerCase() + key.slice(1);
            
            effectOpts[key] = val.split(/,\s*/);
        }

        let enter = "bottom top";
        let leave = "top bottom";
        let target = el.parent;
        let sync = 1.0;
        
        // Start and end are supplied, assume a fixed element that's animated
        // depending on the body's scroll position
        if (el.dataset.animeStart && el.dataset.animeEnd) {
            enter = "0 " + el.dataset.animeStart;
            leave = "0 " + el.dataset.animeEnd;
            target = document.documentElement;
        }

        if (el.dataset.animeSync) {
            sync = parseFloat(el.dataset.animeSync) || 1;
        }
        
        animate(el, {
            ...effectOpts,
            autoplay: onScroll({
                enter,
                leave,
                sync,
                target,
            })
        });
    }
}

main();