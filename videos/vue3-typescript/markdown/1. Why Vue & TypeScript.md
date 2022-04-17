# Why Vue & TypeScript

## Introduction

One of the big topics being discussed in Vue 3 is around TypeScript. However, for those of us who haven’t jumped on the TypeScript train yet, there is understandably a lot of hesitancy when it comes to adding TypeScript to their codebase. In this lesson, I’ll be addressing some of these concerns to help provide another perspective when evaluating whether Vue & TypeScript is a good combination for your project or not.

## Defining TypeScript

First, let’s take a minute to level set as far as what TypeScript is.

From the [TypeScript website](https://www.typescriptlang.org/), “TypeScript is an open-source language which builds on JavaScript, one of the world’s most used tools, by adding static type definitions.”

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-001.opt.jpg?alt=media&token=30686cc3-c819-43e2-8be9-4375bec5f2d7](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-001.opt.jpg?alt=media&token=30686cc3-c819-43e2-8be9-4375bec5f2d7)

If you haven’t worked with static types before, let’s take a normal JavaScript variable called mysteryBox.

JavaScript, by default, is what is called a “dynamically typed” language, which means the variables can be assigned any “type” of value. That means our mysteryBox variable could contain a string, number, boolean, array, object, or something else entirely!

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-002.opt.jpg?alt=media&token=23fe75ae-178a-4364-bef1-fc46ece1b180](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-002.opt.jpg?alt=media&token=23fe75ae-178a-4364-bef1-fc46ece1b180)

While there are a lot of benefits to this, the downside is that it becomes difficult to predict how something should (or should not) behave. So in the event we had a variable called `myAge`, we know that this should always be a number; but without any other tooling, the only way for us to check this would be to always add conditional statements whenever we use the variable `myAge`.

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-003.opt.jpg?alt=media&token=49445bff-6dcd-4696-a6fa-974a18efa4c7](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-003.opt.jpg?alt=media&token=49445bff-6dcd-4696-a6fa-974a18efa4c7)

This is where static types have a lot of value, because they never change and are fixed values, they allow us to define types ahead of time so we can trust that variables like myAge always behave the way we want them to.

With that said, let’s get into the pros and cons of adding TypeScript to your Vue project.

## The cost of TypeScript

Like any additional dependency you add to your codebase, the biggest cost is typically the learning curve required for new developers to become productive with the new tool. As more and more developers come into the world of programming with JavaScript as their first language, this means that there is a lot of new paradigms and things to learn which can be very expensive to teams with tight deadlines.

Let’s be honest, using TypeScript in a codebase seems like it is more than just adding a library to handle a specific part of the application. After all, when we hear most people talk about TypeScript, their entire application is often written in it and it’s probably hard to imagine spending time rewriting your codebase when most of us don’t even have time to refactor the technical debt that already exists! And of course, even when people have added TypeScript to their codebase, it’s not as if everything is suddenly better and their code is suddenly bug-free.

Like any tool or technique, there are compromises and trade-offs that often require experience and often lessons learned in order to get to a happy place for the team. Having heard all of this, the question here is, is it worth it?

## TypeScript are not as scary as you think

The first concern many often have with TypeScript is that it feels different and strange. Given that many of us are used the dynamic typing of JavaScript, learning a new syntax and paradigm for how we define and write code understandably feels odd. However, for those who have used Vue for a little bit, the truth is that chances are very high that you’ve been working with types this entire time. Don’t believe me? Let’s dive into a component.

Here we have the proverbial button component which is supposed to receive text and the background color as props.

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-004.opt.jpg?alt=media&token=85237d4b-77e8-406f-8228-8ea374485a10](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-004.opt.jpg?alt=media&token=85237d4b-77e8-406f-8228-8ea374485a10)

While many of us started by defining props in the array syntax, we see here, most of us converted to using the object syntax to better define our props.

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-005.opt.jpg?alt=media&token=41753317-9e37-4b58-b6e7-4ce516deb91e](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-005.opt.jpg?alt=media&token=41753317-9e37-4b58-b6e7-4ce516deb91e)

And then for those of us who know about custom validators, we often went one step further to add custom validators to ensure we received the component received the correct data.

![https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-006.opt.jpg?alt=media&token=bb8e95f4-7dd7-4611-b907-f5e930dcc851](https://firebasestorage.googleapis.com/v0/b/vue-mastery.appspot.com/o/flamelink%2Fmedia%2Fts-01-006.opt.jpg?alt=media&token=bb8e95f4-7dd7-4611-b907-f5e930dcc851)

After looking over this new and improved version of props on our button component, what you might have realized now is that what we’ve done is assign a “static type” to our props.

In other words, whether you realized it or not, you’ve been leveraging static types this entire time!

## Is TypeScript worth it?

Of course, while we’ve now demystified the use of static types, that still leaves the question of whether it’s worth it to add TypeScript to your codebase.

While TypeScript certainly has lots of benefits when it comes to type checking and such, like I mentioned earlier, the key thing to remember is that all tools have compromises and trade-offs. So if I am going to add additional tooling to a codebase, I want to make sure that it solves a specific problem that I or my team is having.

In my opinion, when a team has little to no experience with TypeScript, the value that TypeScript provides a codebase ultimately comes down to one thing: scalability.

Scalability can be broken down into two primary categories:

1. How large your codebase is?
2. How many users are contributing to your codebase?

### Large Codebases

When we look at Angular, which is a highly opinionated framework that was designed primarily with enterprise companies in mind, their decision to make TypeScript mandatory is something worth considering.

As a codebase grows in size, this often means that there is greater complexity in the moving pieces that ultimately make the application work. Because of this, TypeScript’s ability to provide reliable data structures that developers can trust can be critical to a team’s productivity.

This is why many companies find themselves investing in TypeScript since it helps to provide that additional layer of documentation to code that otherwise might otherwise be lost if the original contributor leaves the company and forgot to add comments to the code they wrote.

### Large Number of Contributors

On the other hand, there are those who be thinking, “Well my application is small, so how would TypeScript benefit me?”

For people in this scenario, TypeScript is particularly beneficial if your application has a large number of contributors. The most common scenario for this is if you maintain an open source project. Since people could be contributing to an open source project at any given time, the ability to provide structure and consistency to contributors is critical.

After all, in addition to making sure the codebase works as expected, it also has the added benefit of reducing the amount of time maintainers have to spend answering questions or resolving PRs that would have been solved with properly defined types.

## What about TypeScript support in Vue?

One of the biggest hurdles that people encountered when using TypeScript in Vue 2 was that while it was technically possible, there was a rather high cost of entry and some things didn’t work as well as they’d like. For example, being able to easily detect types across Vuex was lacking and people had to make various compromises to get it to work.

When hearing this, it’s no surprise that many have avoided adding TypeScript to their Vue projects. For those who don’t know though, Vue 3 was rewritten entirely in TypeScript. As a result, developers can expect better support for TypeScript going forward. So whether it’s developer tooling such as Vetur or libraries such as Router and Vuex, using TypeScript will become much easier. And as a result, the cost of entry is a lower than ever before.

## TypeScript can be progressively added

A misconception that many have is that TypeScript is all or nothing. After all, if you’re going to use TypeScript, shouldn’t your entire application be rewritten in it? The reality is that this couldn’t be further from the truth. In other words, just like how you can progressively migrate a legacy app to Vue by dropping in a CDN package to add Vue functionality, the same can be said of TypeScript.

So rather than feel pressure to rewrite your entire app in TypeScript, I recommend choosing a specific feature where you will enhance it with TypeScript to see whether it’s worth it for your team or not. And if you and/or team see the benefits of TypeScript, then keep slowly refactoring as it makes sense!

## Let’s ReVue

At the end of the day, it’s possible that TypeScript is not a good fit for your project. And if that’s the case, that’s perfectly okay! However, if it seems like TypeScript might have a place in a future project, then be sure to stick around as we dive into the fundamentals of working withe TypeScript in Vue.