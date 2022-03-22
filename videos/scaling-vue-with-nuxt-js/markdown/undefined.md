This course was created with Nuxt 2.3.4\. Please check the [Nuxt docs](https://nuxtjs.org/docs/2.x/get-started/installation) if you run into any issues using a newer version.

# Why Use Nuxt.js?

## 7 Problems you can avoid by using Nuxt.js for your next Vue app

Vue.js is a great choice as a framework for your application. But, there are a couple concerns you’ll likely run into:

* How do I combine and configure all my JavaScript & Vue libraries to work together effectively?
* How do I structure my application code using best practices?
* How do I make sure my application is properly indexed by search engines?
* How do I optimize my Vue application for speed?

These are some of the concerns that Sebastien and Alexandre Chopin set out to solve when they created Nuxt.js, a higher-level framework that’s built _on top of_ Vue to help you build production-ready Vue applications.

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578406880172_0.jpg?alt=media&token=b78d619b-601e-4250-91bc-f1b9a533a259)

I want to let you in 7 problems you’re going to run into building a Vue app, and tell you how Nuxt solves them.

---

### Problem #1: Building a production-ready Vue app from scratch is difficult

Not only does Nuxt come preconfigured with Vuex, Vue Router, and Vue-Meta, but it sets your project up with intelligent defaults based on well researched best practices that Vue won’t give you out of the box.

Creating a Nuxt app is as easy as typing:

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578373622700_1.jpg?alt=media&token=8ed90e59-36b6-4cac-b94e-1b5f404020dd)

This Nuxt Starter Kit will ask you for the libraries you want to start your project with, such as CSS Lint, and which CSS framework to use.

---

### Problem #2: No standard folder structure

As your application grows your code organization becomes more important. Vue’s default build gives you an **assets** and **components** directory, which is a good start. Nuxt.js sets you up with additional folders based on best practices, such as:

📂 A `pages` directory for your Application views and routes.

📂 A `layouts` directory for your layout templates.

📂 A `store` directory for your Vuex store files.

Nuxt ships with more folders and more default conventions which are all configurable, but you get the idea.

**Since everything has its place, moving from one Nuxt application to another as a developer and getting up to speed is super simple.**

---

### Problem #3: Routing configuration can get long in a big Vue app

With Nuxt, you simply place your single file Vue components into the pages folder and Nuxt automatically generates your routes with zero configuration.

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578373636456_2.jpg?alt=media&token=01d3b7f8-cdfb-4e70-b6af-1297ef0fada5)

This is just one more example of how Nuxt gives you the pre-configuration you need to create production-ready Vue applications. This leads us to the next problem with big applications…

---

### Problem #4: No standard way to configure things all together

Luckily, **Nuxt ships with a production ready configuration that doesn’t lock you in.** Meaning if you do you want to override any of the smart defaults or pre-configuration you can edit your nuxt.config.js file and modify any of the framework’s options.

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578373636457_3.jpg?alt=media&token=935c5927-fdc6-4ae7-baca-ad1772ac9677)

---

### Problem #5: Vue apps aren’t not SEO-friendly

You’re going to want certain pages of your app properly indexed by search engines so they’re easily discoverable.

One of the best solutions is to pre-render your Vue pages on the server, but this can be tricky to setup on your own. Nuxt is pre-configured to generate your application on the server, along with powering up your routes to make it easy to add SEO-related tags.

---

### Problem #6: Vue applications on initial load can be slow

With Nuxt.js if you choose to render your application universally or statically, the pre-rendered HTML causes your page to load faster in the browser. Once it’s loaded, it’ll start running as a normal SPA. Plus with automatic code-splitting it’s only going to load the JavaScript needed to make the route function.

This makes for the optimal user experience.

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578373641774_4.gif?alt=media&token=fff100b9-2994-40d7-9067-ed04874449f0)

---

### Problem #7: With a Vue app you may find it difficult to change the behavior of the framework

When you are developing production-grade applications, at some point you’ll need to change the behavior of the framework. Nuxt provides a **higher-order module system** that makes it easy to customize every aspect of Nuxt.

---

## 🏁 Conclusion

So there you have it, 7 problems that Nuxt solves for you. As you can see, **Nuxt.js allows you to spend less time on configuration, and more time solving problems and building awesome Vue apps.**

To get started with Nuxt we recommend jumping into the great documentation, and consider downloading the [Vue Mastery Nuxt cheat sheet](https://www.vuemastery.com/nuxt-cheat-sheet/). By doing this you’ll also be notified when we start releasing additional lessons of our Nuxt course.

![](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2F1578373644192_5.jpg?alt=media&token=b6eefb60-465c-482b-ab7a-63834c50c2a0)