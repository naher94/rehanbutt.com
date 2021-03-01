---
layout: post
title:  "Sun Spot: Portable UV Detection"
tile-name: "Sun Spot"
thumbnail: "sunSpot"
date:   2016-03-01
tags: fabrication physical computing
---

<div class="image-container"><img src="../img/sunSpot/hero.jpeg" alt="Sun Spot in Use" /></div>

<iframe src="https://player.vimeo.com/video/148396535" width="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen title="Sunspot Product Explainer"></iframe>

We constructed a wearable device that can attach to a backpack or bag and notifies the user when they have been exposed to too much UV radiation. The audience for this project includes people who spend a significant amount of time outdoors and are concerned about preventing skin cancer and other UV radiation exposure related diseases. For example, as a product it could be marketed toward more active users, such as surfers or beach goers, and specifically users in Australia or South Africa, as both have a large problem with skin caner. SunSpot would be embedded in the arm of a swim shirt or as could be used as beacons or node for the whole family while on the beach.

The notification system has two responses: it quickly buzzes once every hour except the fourth hour where it would continue to buzz until the user cuts off their UV exposure by going inside or sitting in a shaded area. Once the threshold drops, the buzz will end and the loop will start over again. This timing was chosen because after an hour of UV exposure erythema, or sunburn, of the skin begins, and after four hours the damage to skin cells peaks to dangerous levels.

The device consists of a UV sensor, pulse motor, and a Teensy 3.1 microcontroller. All of the elements were soldered to a protoboard and two pairs of coin batteries were wired in parallel to give the unit 6V of Power. The sensor takes a reading once every second, and calculates an average of the last minute's worth of values. The housing allows for the sensor to receive light and allows for battery changes while keeping the device contained and protected.

The project was extremely successful in the end. The sensor consistently and correctly triggered the pulse motor, and the logic behind the input threshold and output notification is easily understood by users. A Teensy was implemented instead of a Gemma because the Gemma would not communicate with any computer it was connected to. Initially we aimed to make a wearable watch; however, getting the device to be small enough to be comfortable on a wrist was not possible especially without the Gemma and with the bulky pairs of coin batteries. The current backpack accessory design still fits with the original narrative and felt like a logical direction to choose.

I worked on this project with two colleagues of mine, Katelyn Smith & Alex Palatucci.

<div class="image-container"><img src="../img/sunSpot/tech.jpeg" alt="The Hardware" /></div>
