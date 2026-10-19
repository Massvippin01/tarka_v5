# SentinelX --- Multivariate Design Lock

## Decision objective

Resolve UX trade-offs across usability, cognitive load, speed,
accessibility, learnability, evidence safety, distinctiveness and
implementation feasibility.

  ------------------------------------------------------------------------------------------------------------
  Decision                Usability   Cognitive     Speed    Safety   Distinctiveness   Feasibility Decision
                                           Load                                                     
  --------------------- ----------- ----------- --------- --------- ----------------- ------------- ----------
  Compact persistent              5           5         5         5                 4             5 **LOCK**
  left rail                                                                                         

  Full-width top                  3           3         3         4                 3             5 Reject
  navigation                                                                                        

  Dashboard-first                 3           2         3         4                 2             5 Reject
  workflow                                                                                          

  Investigation-first             5           5         5         5                 5             4 **LOCK**
  workspace                                                                                         

  Graph as entire                 2           2         4         3                 5             4 Reject
  product                                                                                           

  Graph as contextual             5           5         5         5                 5             5 **LOCK**
  lens                                                                                              

  AI chatbot as primary           2           2         3         2                 3             5 Reject
  UI                                                                                                

  Contextual AI copilot           5           5         5         5                 5             4 **LOCK**

  Always-on microphone            2           2         4         1                 4             3 Reject

  Push-to-talk +                  5           5         5         5                 5             4 **LOCK**
  explicit session mode                                                                             

  Giant AI avatar                 2           2         2         3                 3             4 Reject

  Small persistent                5           5         5         5                 5             5 **LOCK**
  voice presence                                                                                    

  Modal-heavy                     2           2         2         3                 2             4 Reject
  exploration                                                                                       

  Contextual slide-over           5           5         5         5                 5             5 **LOCK**

  Full-page animation             2           3         2         4                 2             4 Reject

  Instant route +                 5           5         5         5                 4             5 **LOCK**
  subtle orientation                                                                                

  Fixed-width layout              2           1         3         2                 2             4 Reject

  Adaptive fluid                  5           5         5         5                 5             4 **LOCK**
  composition                                                                                       

  Color-heavy                     2           2         3         2                 3             4 Reject
  visualizations                                                                                    

  Semantic restrained             5           5         5         5                 5             5 **LOCK**
  color                                                                                             
  ------------------------------------------------------------------------------------------------------------

## Cognitive-load budget

At a primary screen: - 1 dominant task - 1 dominant workspace - 3--7
primary actions - secondary actions in contextual menus - tertiary
metadata hidden until needed

## Distinctiveness

Do not manufacture uniqueness with visual gimmicks. Make SentinelX
distinctive through: - investigation continuity - contextual voice
assistance - evidence-linked graph - contradiction handling -
explainable leads - one-click expansion - context-preserving
navigation - adaptive large-screen workspace

## Final rule

**More features are valuable only when they remain discoverable,
comprehensible and operationally safe.**
