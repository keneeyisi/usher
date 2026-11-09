# Usher

**Usher is a research demonstrator exploring natural-language navigation of complex websites.** It investigates how people can describe what they are trying to do in their own words and receive guidance to relevant information and destinations within a website.

The project brings together three independent website demonstrators under one landing page. Each provides a different information environment in which to explore the navigation approach.

**Live demonstrator:** [https://keneeyisi.github.io/usher/](https://keneeyisi.github.io/usher/)

## Research focus

Complex websites often organise information around institutional categories, service names and internal terminology. People may approach the same information with a situation, question or task in mind, without knowing which category or page contains the answer.

Usher explores a natural-language interaction that allows a person to express their goal in everyday language. The demonstrator is designed to interpret that request in the context of the selected website and guide the person towards a relevant page or section. Where a request needs more context, the interaction can include a clarification step.

The project is concerned with helping people navigate information. It does not claim that a natural-language interface can replace a website's underlying information architecture or guarantee that every request will be interpreted correctly.

## Demonstrators

The landing page brings together three separate demonstrator websites:

| Demonstrator | Example information environment |
| --- | --- |
| **CivicSphere** | Local government and public services, including areas such as housing, parking, payments and council support. |
| **Insura** | Insurance information, including policy types, claims, renewals, changes and support. |
| **Lumenet** | Broadband and telecommunications information, including plans, faults, billing, equipment and account support. |

The three environments provide different terminology, service structures and navigation contexts for exploring the same broad research question.

The demonstrators retain their own site files, profiles and navigation structures. The Usher landing page provides a shared entry point and lets visitors select and explore each site.

## Exploring the demonstrator

1. Open the [Usher demonstrator](https://keneeyisi.github.io/usher/).
2. Choose CivicSphere, Insura or Lumenet.
3. Explore the selected website using its navigation and search features.
4. Try describing a goal or situation in the Usher natural-language interface.
5. Follow the suggested destination and, where presented, respond to a clarification prompt.

The available routes and responses depend on the content and configuration of the selected demonstrator.

## Project structure

```text
.
├── index.html
├── README.md
└── sites/
    ├── civicsphere/
    ├── insura/
    └── lumenet/
```

- `index.html` contains the shared Usher landing page, demonstrator selector and embedded website viewer.
- `sites/civicsphere/` contains the CivicSphere demonstrator and its Usher-related configuration and assets.
- `sites/insura/` contains the Insura demonstrator and its Usher profile, content and assets.
- `sites/lumenet/` contains the Lumenet demonstrator and its Usher profile, content and assets.

Each demonstrator has its own content and configuration. The combined repository is a deployment copy; it does not replace the individual site implementations.

## Running locally

The site uses the `/usher/` project path expected by the GitHub Pages deployment. To preview it locally, place or clone the repository in a folder named `usher` and start a static server from the folder containing that repository.

For example, if the repository is located at `~/Documents/GitHub/usher`:

```bash
cd ~/Documents/GitHub
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/usher/
```

Opening `index.html` directly using a `file://` URL is not a reliable way to test the site because the demonstrators use web paths and browser features that expect to be served over HTTP.

## Scope and limitations

Usher is a research demonstrator, not a live council, insurance or broadband service. CivicSphere, Insura and Lumenet use synthetic demonstration content. They are not connected to real service providers or public authorities.

The demonstrators do not issue real insurance policies, process claims or payments, submit council applications, manage broadband accounts, or carry out other real-world transactions. Any form or action that is not connected to a live service is for demonstration purposes only.

The examples illustrate the interaction and navigation concept. They should not be treated as authoritative legal, financial, insurance, council or telecommunications guidance.

## Deployment

The public project site is intended to be served from:

[https://keneeyisi.github.io/usher/](https://keneeyisi.github.io/usher/)

The repository must have GitHub Pages configured for the project's deployment setup. After a change is committed and pushed to the `main` branch, check the repository's **Actions** tab for the deployment result and confirm that the published site loads correctly.

## Research context

Usher is being developed as part of research on natural-language navigation for complex websites. The demonstrators provide practical environments for presenting and exploring the concept.

For the research framing, study questions, method and findings, refer to the associated research paper or submission. This repository documents the demonstrator and its implementation files; it does not, on its own, establish evaluation results or research findings.

## Copyright

© 2026 Kenechukwu Eyisi. All rights reserved. This is a research demonstration. Permission is not granted to copy, modify or redistribute the contents.
