---
layout: archive
title: "Research"
permalink: /research/
author_profile: true
---




<html>
<head>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.3/css/all.css" integrity="sha384-T9aP3j3Fd91dj3pU8WzNwwgxvOoPONn0R5jOgwN0RmJmRlRpiJ+qnztxKGPgDms/" crossorigin="anonymous">  <style>    display: block;
.bouton-article {
  color: #fff;
  text-decoration: none;
  font-weight: bold;
  padding: 10px 25px;
  display: inline-flex;
  align-items: center;
  border: none;
  box-sizing: border-box;
  transition: all 0.2s ease-in-out;
  outline: 2px solid #dcdcdc;
  background-color: #3D3D3D; 
}
.bouton-article:hover {
  background-color: #e21313;
  color: #ffffff;
  border-color: #e21313;
  transition: all 0.3s ease-in-out;
}
.bouton-article + .bouton-article {
  margin-left: 10px;
}
 .bordered-button {
  border: 2px solid #e21313;
  padding: 5px;
  border-radius: 4px;
}
    [id^="article-image-"] {
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.5s ease-out;
      position: relative;
      margin: 0 auto;
      max-width: 600px; /* ajouter une largeur maximale pour éviter que l'image ne devienne trop grande */
    }
    [id^="article-image-"].centered {
      display: flex;
      justify-content: center;
    }
   [id^="article-image-"]:hover img {
      opacity: 0.2;
    }
  #article-image-1:hover::after {
content: "Land Reform and Productivity: Evidence from the Dissolution of the French Monasteries";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: black;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      z-index: 1;
      opacity: 1;
    }
    #article-image-2:hover::after {
content: "Speed of Convergence in a Malthusian World: Weak or Strong Homeostasis?";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: black;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      z-index: 1;
      opacity: 1;
    }
      #article-image-3:hover::after {
content: "Access to Justice and Economic Development: Evidence from an International Panel Dataset";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: black;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      z-index: 1;
      opacity: 1;
    }
    [id^="article-summary-"] {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.5s ease-out, border-color 0s 0.5s;
      display: flex;
      flex-wrap: wrap;
      border: 0 solid #e21313;
      border-top: none;
    }
    [id^="article-summary-"].active {
      max-height: 1000px;
      transition: max-height 1s ease-in, border-color 0s;
      border-color: #e21313;
      border: 3px solid #e21313;
      padding: 20px;
    }
    #article-summary p {
      display: inline-block;
      width: 100%;
  padding-bottom: 0.25rem;
  margin-bottom: 0.25rem;
  margin-top: 0.25rem;
  text-align: justify;
    }
  </style>
  
<script>
  $(document).ready(function() {
    for (let i = 1; i <= 3; i++) {
      $(`#article-image-${i}`).click(function() {
        $(`#article-summary-${i}`).toggleClass("active");
      });
    }
  });
</script>

</head>
<body>
  
<div id="article-image-1" class="centered" style="max-width: 400px;">
  <img src="{{site.url}}/images/Poster_Biens_Nationaux_à_vendre_1790_France.png" alt="Article image">
</div>
  <div id="article-summary-1" style="margin-bottom: 30px; text-align: justify;">
  <p style="display: inline-block; width: 100%;"><b>Land Reform and Productivity: Evidence from the Dissolution of French Monasteries</b> <br> This article uses the confiscation and auction of monastic properties during the French
Revolution to assess the effects of land reallocation on agricultural productivity. To proxy
for monastic landholdings, I construct a novel dataset using the annual income and location
of more than 1,500 French monasteries in 1768. I perform several cross-checking analyses
and demonstrate the validity of the data as a proxy for monastic landholdings both at the
monastery and arrondissement levels. I show that arrondissements with greater land real-
location experienced higher levels of agricultural productivity in the mid-19th century. I
trace these increases in productivity to the creation of larger and less fragmented farms,
leading to an increase in mechanization and the substitution of family labor with a hired
specialized labor force.</p>
  <br>
<a href="https://ideas.repec.org/p/ctl/louvir/2023009.html" class="bouton-article bordered-button"><i class="fas fa-file-pdf"></i> Working Paper</a>
    <a href="#" class="bouton-article bordered-button"><i class="fab fa-slideshare"></i> Slides</a> 
</div>
  
  <div id="article-image-2" class="centered" style="max-width: 400px;">
  <img src="{{site.url}}/images/septembre.jpg" alt="Article image">
</div>
  <div id="article-summary-2" style="margin-bottom: 30px; text-align: justify;">
  <p style="display: inline-block; width: 100%;"><b>Speed of Convergence in a Malthusian World: Weak or Strong <i>Homeostasis</i>?</b> <br> Standard Malthusian models predict that a productivity or population shock modify in-
come per capita in the short run. In the long run, however, population pressures make
income per capita gradually come back to its steady state. I investigate the duration of
this short-run fluctuation, estimating the speed of convergence of Malthusian economies
to their GDP per capita and population steady-states. To do so, I first build and calibrate
a Malthusian model capturing explicitly the idea that marriages are postponed (advanced)
and fertility potential of couples reduced (augmented) during depressions (expansions). I
then also run beta-convergence regressions on historical panel data. I find consistent evidence
of weak homeostasis, with a half-life of about one century. It implies that early modern
data may display high persistence without necessarily rejecting the Malthusian hypothesis.</p>
  <br>
<a href="https://ideas.repec.org/p/ctl/louvir/2023010.html" class="bouton-article bordered-button"><i class="fas fa-file-pdf"></i> Working Paper</a>
    <a href="#" class="bouton-article bordered-button"><i class="fab fa-slideshare"></i> Slides</a>
</div>
  
    <div id="article-image-3" class="centered" style="max-width: 400px;">
  <img src="{{site.url}}/images/atj_sdg.jpg" alt="Article image">
</div>
  <div id="article-summary-3" style="margin-bottom: 30px;">
  <p style="display: inline-block; width: 100%; text-align: justify;"><b>Access to Justice and Economic Development: Evidence from an International Panel Dataset</b> <br> This paper evaluates the importance of access to justice (ATJ) for economic growth. We create a new database
on the number of professional judges per 100,000 inhabitants by collecting data from various public institutions.
We draw on these data as a macro-level proxy capturing the fundamental and historical evolution of ATJ from
1970 to 2014 for a wide range of developed and developing countries. Using an instrumental variable approach
in a dynamic panel setting to deal with endogeneity, we show that ATJ is a positive and significant determinant
of economic growth. The substantial aggregate effect of ATJ is inversely related to the initial level of income per
capita, human capital, democracy, economic freedom, and the rule of law. These results hint at a stronger impact
of ATJ on economic development in less developed societies. In terms of mechanisms, our results suggest that ATJ
promotes growth via higher government accountability and improved quality of institutions.</p>
  <br>
<a href="https://arnauddeseau.github.io/files/a2j_and_growth_shrllll.pdf" class="bouton-article bordered-button"><i class="fas fa-file-pdf"></i> Latest Draft</a>
    <a href="https://ideas.repec.org/p/ctl/louvir/2019009.html" class="bouton-article bordered-button"><i class="fas fa-file-pdf"></i> Working Paper</a>
    <a href="https://adam-levai.com/" class="bouton-article bordered-button"><i class="fas fa-user-friends"></i> Adam Levai</a>
    <a href="https://www.researchgate.net/profile/Michele-Schmiegelow" class="bouton-article bordered-button"><i class="fas fa-user-friends"></i> Michèle Schmiegelow</a>
</div>
  

</body>
</html>

  
  
  


<table><tr>
<td>
<div style="text-align: justify">
<span style="color:#dc143c"> <strong>M</strong></span><strong>onasteries and </strong><span style="color:#dc143c"> <strong>R</strong></span><strong>evolutions</strong>
<br/>
During medieval times, monasteries were places of spiritual activity; but not only. Monasteries were also important economic actors possessing significant amount of the land, forests, mills, houses and forges. More importantly, they were true feudal landlords, collecting taxes and exercising feudal rights on the land. After the Revolution, the land and production facilities owned by the Church and monasteries were confiscated and auctioned through the event known as the <em>Vente des Biens Nationaux</em>. In the space of five years, 6% of French land and more than 170,000 buildings, had been reallocated by the market from the Church to secular owners, of which a substantial part came from monastic properties (Bodinier and Teyssier, 2000). According to the French historian Lecarpentier (1908, author’s translation p. 4), this was “the most important event of the Revolution”.
<br/>
In this project, I (i) proxy the local economic importance of French monasteries before 1789 and (ii) study the economic and social consequences of the reallocation by the market of the land and production facilities owned by monasteries.
</div>
</td>
<td> 
  <p align="center">
    <img src="{{site.url}}/images/thionville.jpg" width="7600">
    <br>
    <em style="color: grey">List of properties for sale in the district of Thionville on July 27, 1791</em>
  </p> 
</td>
</tr></table>

<li><span style="color:#dc143c">Job Market Paper: Land Reform and Productivity: Evidence from the Dissolution of the French Monasteries</span> </li> 
<a href="https://arnauddeseau.github.io/files/JMP_Arnaud_Deseau.pdf"><i class="fas fa-file-pdf"></i></a> Latest Draft



<br/>


<table><tr>
<td>
<div style="text-align: justify">
<span style="color:#dc143c"> <strong>M</strong></span><strong>althusian</strong><span style="color:#dc143c"> <strong>D</strong></span><strong>ynamics</strong>
<br/>
One of the most central prediction of the Malthusian theory is that standards of living were stagnant before the onset of industrialization. Stagnation however does not literally mean constant, or flat, per capita income. In fact, any shock striking a Malthusian economy generates fluctuations, or volatility, in the standards of living, namely temporary or non-sustained economic growth. Indeed, a simple Malthusian model predicts that a positive shock on the technology level – say the introduction of better cultivation techniques – increases income per capita in the short run only; in the long run, population increases and the economy returns to its initial level of income per capita. This is the so-called “Malthusian trap” mechanism, that has been recognized as one of the major obstacles to achieve sustained economic growth during millennia (Kremer, 1993; Galor and Weil, 2000; Hansen and Prescott, 2002; Clark, 2007; Ashraf and Galor, 2011; Galor, 2011). 
<br/>
While the existence of the Malthusian trap mechanism is widely accepted, previous literature has found mixed evidence about its exact strength. A first group of studies finds evidence of weak <em>homeostasis</em>, with half-lives ranging from one (Lee and Anderson, 2002; Fernihough, 2013; Bouscasse et al., 2021) to several centuries (Crafts and Mills, 2009). On the other hand, Madsen et al. (2019) find evidence of strong homeostasis, with half-lives ranging between 10 and 30 years. In this project, I investigate the question of the strength of the Malthusian trap by examining the speed of convergence of Malthusian economies to their steady state – i.e. the time it takes them to go back to their steady state after a shock. 
</div>
</td>
<td> 
  <p align="center">
    <img src="{{site.url}}/images/septembre.jpg" width="10500">
    <br>
    <em style="color: grey">Les Très Riches Heures du Duc de Berry - Septembre</em>
  </p> 
</td>
</tr></table>

<li><span style="color:#dc143c">Speed of Convergence in a Malthusian World: Weak or Strong <em>Homeostasis</em>?</span>. <em>Draft available upon request</em> </li> 
<br/>


<table><tr>
<td>
<div style="text-align: justify">
<span style="color:#dc143c"> <strong>A</strong></span><strong>ccess to </strong><span style="color:#dc143c"> <strong>J</strong></span><strong>ustice</strong>
<br/>
The last decade has seen a growing recognition of Access to Justice (ATJ) as one of the major challenges in the development of peaceful and prosperous societies for the coming years. A study conducted by the World Justice Project in 2019 estimates that as much as 5.1 billion people – or approximately two-thirds of humanity – face issues related to ATJ. The obstacles to reaching justice are numerous, ranging from time and costs factors to discrimination of all kinds; they impede the accurate delivery of justice in civil, administrative, and criminal matters. This has direct and strong implications for peoples’everyday decisions in the most fundamental economic operations. Consequently, such obstacles to justice generate substantial economic costs and slows down economic development in both developed and developing societies.
<br/>
Although existing contributions to the literature have stressed the importance of legal codes as well as effective or de facto judicial institutions for economic development, surprisingly little is known about the importance of the central notion of ATJ for economic development. In this project, we take a long-run perspective to (i) trace the historical evolution of ATJ through time and accross country and (ii) evaluate the contribution of ATJ to economic development.
</div>
</td>
<td> 
  <p align="center">
    <img src="{{site.url}}/images/atj_sdg.jpg" width="8000">
    <br>
    <em style="color: grey">Sustainable Development Goal 16</em>
  </p> 
</td>
</tr></table>

<li><span style="color:#dc143c">Access to Justice and Economic Development: Evidence from an International Panel Dataset</span> (with Adam Levai and Michèle Schmiegelow). <em>Submited.</em> </li> 
<a href="https://arnauddeseau.github.io/files/a2j_and_growth_shrllll.pdf"><i class="fas fa-file-pdf"></i></a> Latest Draft | <a href="https://adam-levai.com/"><i class="fas fa-user-friends"></i></a> Adam Levai | <a href="https://www.researchgate.net/profile/Michele-Schmiegelow"><i class="fas fa-user-friends"></i></a> Michèle Schmiegelow


<!-- 
[this](#Buttons){: .btn--research}

<a href="{{ site.baseurl }}/index.html"><i class="fas fa-file-pdf"></i></a>

<a href="{{ site.baseurl }}/index.html"><i class="fas fa-file-pdf fa-2x"></i></a>

-->
