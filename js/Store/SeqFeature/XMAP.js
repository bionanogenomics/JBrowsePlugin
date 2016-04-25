define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/Deferred',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Store/DeferredFeaturesMixin',
        'JBrowse/Store/DeferredStatsMixin',
        'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
        'JBrowse/Model/XHRBlob',
        './XMAP/Parser',
        './CMAP/SimpleCMAPParser',
        './SMAP/Parser'
    ],
    function(
        declare,
        lang,
        array,
        Deferred,
        SimpleFeature,
        SeqFeatureStore,
        DeferredFeatures,
        DeferredStats,
        GlobalStatsEstimationMixin,
        XHRBlob,
        Parser,
        SimpleCMAPParser,
        SMAPParser
    ) {

        return declare([SeqFeatureStore, DeferredFeatures, DeferredStats, GlobalStatsEstimationMixin],

            /**
             * @lends JBrowse.Store.SeqFeature.GFF3
             */
            {
                constructor: function(args) {
                    this.data = args.xblob;
                    this.qcdata = args.qcblob;
                    this.rcdata = args.rcblob;
                    this.smapdata = args.smapblob;
                    this.molecule = args.molecule,
                        this.features = [];
                    var defaultRefNames = {
                        1: "chr1",
                        2: "chr2",
                        3: "chr3",
                        4: "chr4",
                        5: "chr5",
                        6: "chr6",
                        7: "chr7",
                        8: "chr8",
                        9: "chr9",
                        10: "chr10",
                        11: "chr11",
                        12: "chr12",
                        13: "chr13",
                        14: "chr14",
                        15: "chr15",
                        16: "chr16",
                        17: "chr17",
                        18: "chr18",
                        19: "chr19",
                        20: "chr20",
                        21: "chr21",
                        22: "chr22",
                        23: "chrX",
                        24: "chrY"
                    };
                    this.referenceNames = args.referenceNames || defaultRefNames;
                    this._loadFeatures();
                },

                getMolecule: function() {
                    return this.molecule;
                },

                _loadFeatures: function() {
                    var thisB = this;
                    var features = this.bareFeatures = [];
                    var reffeatures = [];

                    var featuresSorted = true;
                    var seenRefs = this.refSeqs = {};
                    var rcFeatures = this.rcBareFeatures = {};
                    var smapFeatures = this.smapBareFeatures = {};
                    var qcFeatures = this.qcBareFeatures = [];
                    var refFeatures = this.refBareFeatures = {};
                    var fail = this.fail = lang.hitch(this, '_failAllDeferred');
                    var thisB = this;
                    if (this.data && this.qcdata) {
                        var qcParser = new SimpleCMAPParser({

                            featureCallback: function(fs) {
                                array.forEach(fs, function(feature) {
                                    if (!qcFeatures[feature.cmap_id])
                                        qcFeatures[feature.cmap_id] = {};
                                    qcFeatures[feature.cmap_id][feature.site_id] = feature;
                                });

                            },
                            endCallback: function() {
                                thisB._smapParser(thisB._rcMapParser, thisB);
                            }
                        });


                        // parse the whole file and store it
                        this.qcdata.fetchLines(
                            function(line) {
                                try {
                                    //RC Parser Add
                                    qcParser.addLine(line);

                                } catch (e) {
                                    fail('Error parsing RC MAP file.');
                                    throw e;
                                }
                            },
                            lang.hitch(qcParser, 'finish'),
                            fail
                        );
                    }
                },

                _smapParser: function(endCallback, scope) {
                    var smapFeatures = this.smapBareFeatures;
                    var fail = lang.hitch(this, '_failAllDeferred');
                    var thisB = this;
                    var smapParser = new SMAPParser({
                        featureCallback: function(fs) {
                            array.forEach(fs, function(feature) {
                                //Store this information in a map as subfeatures.
                                feature.seq_id = thisB.referenceNames[feature.seq_id];
                                if (feature.seq_id === thisB.browser.refSeq.name) {
                                    if (!smapFeatures[feature.seq_id])
                                        smapFeatures[feature.seq_id] = [];
                                    smapFeatures[feature.seq_id].push(feature);
                                }
                            });
                        },
                        endCallback: function() {
                            endCallback(thisB._xMapParser, thisB);
                        }
                    });
                    if (!thisB.smapdata)
                        endCallback(thisB._xMapParser, thisB);
                    else {
                        thisB.smapdata.fetchLines(
                            function(line) {
                                try {
                                    smapParser.addLine(line);
                                } catch (e) {
                                    fail('Error parsing SMAP file.');
                                    throw e;
                                }
                            },
                            lang.hitch(smapParser, 'finish'),
                            fail
                        );
                    }
                },

                _rcMapParser: function(endCallback, scope) {
                    
                    var fail = lang.hitch(scope, '_failAllDeferred');
                    var thisB = scope;
                    var refFeatures = thisB.refBareFeatures;
                    var rcParser = new SimpleCMAPParser({

                        featureCallback: function(fs) {
                            array.forEach(fs, function(feature) {
                                feature.cmap_id = thisB.referenceNames[feature.cmap_id];
                                if (feature.cmap_id === thisB.browser.regularizeReferenceName(feature.cmap_id)) {
                                    if (!refFeatures[feature.cmap_id])
                                        refFeatures[feature.cmap_id] = {};
                                    var parsed = {};
                                    parsed.seq_id = feature.cmap_id;
                                    parsed.type = feature["label_channel"];
                                    parsed.start = feature['position'];
                                    parsed.end = parsed.start + 7;
                                    parsed.site_id = feature.site_id;
                                    parsed.score = null;
                                    parsed.phase = 0;
                                    // parsed.strand = f[7];
                                    parsed.strand = null;
                                    parsed.attributes = {
                                        "ID": [key]
                                    };
                                    refFeatures[feature.cmap_id][feature.site_id] = parsed;
                                }

                            });

                        },
                        endCallback: function() {
                            endCallback(thisB);
                        }
                    });

                    if (!scope.rcdata) {
                        endCallback(scope);
                    } else {
                        scope.rcdata.fetchLines(
                            function(line) {
                                try {
                                    //RC Parser Add
                                    rcParser.addLine(line);

                                } catch (e) {
                                    fail('Error parsing RC MAP file.');
                                    throw e;
                                }
                            },
                            lang.hitch(rcParser, 'finish'),
                            fail
                        );
                    }

                },

                _xMapParser: function(scope) {
                    // var fail = lang.hitch(this, '_failAllDeferred');
                    var thisB = scope;
                    var features = thisB.bareFeatures;
                    var seenRefs = thisB.refSeqs;
                    var featureMap = {};
                    var featuresSorted = true;
                    var parser = new Parser({
                        featureCallback: function(fs) {
                            array.forEach(fs, function(feature) {
                                feature.seq_id = thisB.referenceNames[feature.seq_id];
                                if (feature.seq_id === thisB.browser.refSeq.name) {
                                    var prevFeature = features[features.length - 1];
                                    if (feature.seq_id) {
                                        // console.log("Chromosome ID->"+feature.seq_id+"<-");
                                        var regRefName = thisB.browser.regularizeReferenceName(feature.seq_id);
                                        if (regRefName in seenRefs && prevFeature && prevFeature.seq_id != feature.seq_id)
                                            featuresSorted = false;
                                        if (prevFeature && prevFeature.seq_id == feature.seq_id && feature.start < prevFeature.start)
                                            featuresSorted = false;

                                        if (!(regRefName in seenRefs))
                                            seenRefs[regRefName] = features.length;

                                        if (!featureMap[feature.name]) {
                                            featureMap[feature.name] = feature;
                                        }
                                        //Combine them
                                        var oldFeature = featureMap[feature.name];
                                        if (parseFloat(feature.Confidence) >= parseFloat(oldFeature.Confidence)) {

                                            featureMap[feature.name] = feature;
                                            feature = thisB._labelData(feature);
                                            var map = feature.subfeatures[0].map;
                                            var refSub = null;
                                            var start  = 1;
                                            if (feature.seq_id in thisB.refBareFeatures) {
                                                refSub = thisB.refBareFeatures[feature.seq_id][map.ref];
                                                while (!refSub && start < feature.subfeatures.length) {
                                                    map = feature.subfeatures[start].map;
                                                    refSub = thisB.refBareFeatures[feature.seq_id][map.ref];
                                                    start++;
                                                }
                                            }
                                            
                                            var queSub = thisB._getQCSubFeature(feature.subfeatures, map.query);

                                            if (refSub && queSub) {
                                                var plstart = parseInt(refSub.start);
                                                
                                               
                                                if(feature.strand === '+')
                                                {
                                                    feature.start = parseInt(plstart - queSub.position) ; // The query start is from the first label backwards.
                                                    feature.end = feature.start + parseInt(queSub.contig_length);
                                                    var matchedFeatures  = {};
                                                    for (var i = 0; i < feature.subfeatures.length; i++) {                                                       
                                                        matchedFeatures[feature.subfeatures[i].name] = true;
                                                    }
                                                    feature.subfeatures.length = 0;
                                                    for(var key in thisB.qcBareFeatures[feature.name])
                                                    {
                                                        var subf= thisB.qcBareFeatures[feature.name][key];
                                                        
                                                        var parsed = {};
                                                        parsed.seq_id = subf.seq_id;
                                                        parsed.name = subf.site_id;
                                                        if(matchedFeatures[parsed.name])
                                                            parsed.type = subf['label_channel'];
                                                        else
                                                            parsed.type = 'nomatch';
                                                        parsed.start = feature.start + parseInt(subf['position']);
                                                                                                               
                                                        parsed.end = parsed.start+7;
                                                        parsed.score = null;
                                                        parsed.phase = 0;                                            
                                                      
                                                        feature.subfeatures.push(parsed);
                                                        
                                                    }
                                                }
                                                else
                                                {    
                                                    var startOffset = parseInt(queSub.contig_length)-parseInt(thisB.qcBareFeatures[feature.name]["1"]['position'])-parseInt(thisB.qcBareFeatures[feature.name][queSub.num_sites]['position']);
                                                    var endOffset = parseInt(queSub.contig_length)-parseInt(thisB.qcBareFeatures[feature.name][queSub.num_sites]['position']);
                                                    feature.start = parseInt(plstart - startOffset); // The query start is from the first label backwards.
                                                    feature.end = feature.start + parseInt(queSub.contig_length);
                                                    var matchedFeatures  = {};
                                                    for (var i = 0; i < feature.subfeatures.length; i++) {                                                       
                                                        matchedFeatures[feature.subfeatures[i].name] = true;
                                                    }
                                                    feature.subfeatures.length = 0;
                                                    for(var key in thisB.qcBareFeatures[feature.name])
                                                    {
                                                        var subf= thisB.qcBareFeatures[feature.name][key];
                                                        
                                                        var parsed = {};
                                                        parsed.seq_id = subf.seq_id;
                                                        parsed.name = subf.site_id;
                                                        if(matchedFeatures[parsed.name])
                                                            parsed.type = subf['label_channel'];
                                                        else
                                                            parsed.type = 'nomatch';
                                                        
                                                        parsed.start = feature.start + startOffset + feature.qstart - parseInt(subf['position']);// + parseInt(f.start);
                                                                                                               
                                                        parsed.end = parsed.start+7;
                                                        parsed.score = null;
                                                        parsed.phase = 0;                                            
                                                      
                                                        feature.subfeatures.push(parsed);
                                                        
                                                    }
                                                }
                                                for(var i=0;i<features.length;i++)
                                                {
                                                    if(features[i].name === feature.name)
                                                        features.splice(i);
                                                }  
                                                var sfeatures = feature.subfeatures;                        
                                                // sfeatures.sort(thisB._compareFeatureData);
                                                features.push(feature);                      
                                            }
                                            else
                                            {
                                                for(var i=0;i<features.length;i++)
                                                {
                                                    if(features[i].name === feature.name)
                                                        features.splice(i);
                                                }                          
                                                features.push(feature);      
                                            }
                                        }

                                    }
                                }
                            });
                        },
                        endCallback: function() {


                            if (!featuresSorted) {
                                features.sort(thisB._compareFeatureData);
                                // need to rebuild the refseq index if changing the sort order
                                thisB._rebuildRefSeqs(features);
                            }

                            thisB._estimateGlobalStats()
                                .then(function(stats) {
                                    thisB.globalStats = stats;
                                    thisB._deferred.stats.resolve();
                                });

                            thisB._deferred.features.resolve(features);

                        }
                    });
                    // parse the whole file and store it
                    thisB.data.fetchLines(
                        function(line) {
                            try {
                                parser.addLine(line);
                            } catch (e) {
                                fail('Error parsing XMAP file.');
                                throw e;
                            }
                        },
                        lang.hitch(parser, 'finish'),
                        thisB.fail
                    );
                },

                _getQCSubFeature: function(features, subfeatureName) {
                    for (var i = 0; i < features.length; i++) {
                        if (features[i].name === subfeatureName)
                            return features[i];
                    }
                    return undefined;
                },

                _rebuildRefSeqs: function(features) {
                    var refs = {};
                    for (var i = 0; i < features.length; i++) {
                        if (features[i].seq_id) {
                            var regRefName = this.browser.regularizeReferenceName(features[i].seq_id);

                            if (!(regRefName in refs))
                                refs[regRefName] = i;
                        }
                    }
                    this.refSeqs = refs;
                },

                _compareFeatureData: function(a, b) {
                    if (a.seq_id < b.seq_id)
                        return -1;
                    else if (a.seq_id > b.seq_id)
                        return 1;

                    return a.start - b.start;
                },

                _getFeatures: function(query, featureCallback, finishedCallback, errorCallback) {
                    var thisB = this;
                    thisB._deferred.features.then(function() {
                        thisB._search(query, featureCallback, finishedCallback, errorCallback);
                    });
                },

                _search: function(query, featureCallback, finishCallback, errorCallback) {
                    // search in this.features, which are sorted
                    // by ref and start coordinate, to find the beginning of the
                    // relevant range
                    var bare = this.bareFeatures;
                    var converted = this.features;

                    var refName = this.browser.regularizeReferenceName(query.ref);

                    var i = this.refSeqs[refName];
                    if (!(i >= 0)) {
                        finishCallback();
                        return;
                    }

                    var checkEnd = 'start' in query ? function(f) {
                        return f.get('end') >= query.start;
                    }

                    : function() {
                        return true;
                    };

                    for (; i < bare.length; i++) {
                        // lazily convert the bare feature data to JBrowse features
                        var f = converted[i] ||
                            (converted[i] = function(b, i) {
                                    bare[i] = false;
                                    return this._formatFeature(b);
                                }
                                .call(this, bare[i], i)
                            );
                        // features are sorted by ref seq and start coord, so we
                        // can stop if we are past the ref seq or the end of the
                        // query region
                        if (f._reg_seq_id != refName || f.get('start') > query.end)
                            break;

                        if (checkEnd(f)) {
                            featureCallback(f);
                        }
                    }

                    finishCallback();
                },

                _formatFeature: function(data) {
                    var f = new SimpleFeature({
                        data: this._featureData(data),
                        id: (data.attributes.ID || [])[0]
                    });
                    f._reg_seq_id = this.browser.regularizeReferenceName(data.seq_id);
                    return f;
                },

                // flatten array like [ [1,2], [3,4] ] to [ 1,2,3,4 ]
                _flattenOneLevel: function(ar) {
                    var r = [];
                    for (var i = 0; i < ar.length; i++) {
                        r.push.apply(r, ar[i]);
                    }
                    return r;
                },
                _labelData: function(data) {
                    var f = lang.mixin({}, data);
                    var sub = [];

                    if (this.data) {
                        //QC Map matching using the alignment string.                        
                        var alignments = f.alignment.split(')');

                        for (var i = 0; i < alignments.length - 1; i++) {
                            var alignment = alignments[i];
                            var tokens = alignment.substring(1);
                            tokens = tokens.split(",");
                            var ref = tokens[0];
                            var query = tokens[1];
                            var parsed = {};
                            parsed.seq_id = f.seq_id;     
                            parsed.position = this.qcBareFeatures[f.query_contig_id][query]['position'];
                            parsed.num_sites =this.qcBareFeatures[f.query_contig_id][query]['num_sites'];
                            parsed.contig_length = parseInt(this.qcBareFeatures[f.query_contig_id][query].contig_length);                      
                            parsed.name = this.qcBareFeatures[f.query_contig_id][query]['site_id'];
                            parsed.type = this.qcBareFeatures[f.query_contig_id][query]['label_channel'];        
                            if(f.strand==="-")                
                                parsed.start = f.start + f.qstart-parseInt(this.qcBareFeatures[f.query_contig_id][query]['position']);// + parseInt(f.start);
                            else
                            {
                                if(parseInt(f.qstart) === parseInt(this.qcBareFeatures[f.query_contig_id][query]['position']))
                                    parsed.start = f.start;
                                else
                                    parsed.start = parseInt(this.qcBareFeatures[f.query_contig_id][query]['position']) + parseInt(f.start);
                            }
                            
                            parsed.end = parsed.start + 7;
                            parsed.score = null;
                            parsed.phase = 0;
                            // parsed.strand = f[7];
                            parsed.strand = null;
                            parsed.map = {
                                ref: ref,
                                query: query
                            };
                            parsed.attributes = {
                                "ID": [query]
                            };
                            sub.push(parsed);
                        }
                        sub.sort(this._compareFeatureData);
                        if (sub.length)
                            f.subfeatures = sub;
                    }
                    return f;
                },

                _featureData: function(data) {
                    var f = lang.mixin({}, data);
                    return f;
                    // var sub = [];
                    // if (this.smapdata) {
                    //     //SMAP Features overlapped with QC Map
                    //     //May be a little performance overhead here. Check again.
                    //     var smaps = this.smapBareFeatures[f.seq_id];

                    //     for (var s = 0; s < smaps.length; s++) {
                    //         var smap = smaps[s];

                    //         if (smap.start >= 0 && smap.end >= 0 && smap.start > f.start && smap.end < f.end) {
                    //             var parsed = {};
                    //             parsed.seq_id = f.seq_id;
                    //             parsed.type = smap.type;
                    //             // parsed.start = parseInt(this.rcBareFeatures[f.seq_id][ref]['position']);
                    //             parsed.start = smap.start;
                    //             parsed.end = smap.end;
                    //             parsed.score = null;
                    //             parsed.phase = 0;
                    //             // parsed.strand = f[7];
                    //             parsed.strand = null;
                    //             sub.push(parsed);
                    //         }
                    //     }
                    // }
                    // if (this.data) {
                    //     //QC Map matching using the alignment string.
                    //     if(!f.alignment)
                    //         console.log(f.alignment);
                    //     var alignments = f.alignment.split(')');

                    //     //This is only needed if we use the reference positions instead of the query in which case average.

                    //     // var subfeatures = {};
                    //     // for (var i = 0; i < alignments.length - 1; i++) 
                    //     // {
                    //     //     var alignment = alignments[i];
                    //     //     var tokens = alignment.substring(1);
                    //     //     tokens = tokens.split(",");
                    //     //     var ref = tokens[0];
                    //     //     var query = tokens[1];
                    //     //     var start = parseInt(this.qcBareFeatures[f.seq_id][query]['position']);
                    //     //     if (!subfeatures[query])
                    //     //         subfeatures[query] = [];
                    //     //     subfeatures[query].push(start);
                    //     // }
                    //     for (var i = 0; i < alignments.length - 1; i++) {
                    //         var alignment = alignments[i];
                    //         var tokens = alignment.substring(1);
                    //         tokens = tokens.split(",");
                    //         var ref = tokens[0];
                    //         var query = tokens[1];
                    //         var parsed = {};
                    //         parsed.seq_id = f.seq_id;
                    //         parsed.name = this.qcBareFeatures[f.query_contig_id][query]['site_id'];
                    //         parsed.type = this.qcBareFeatures[f.query_contig_id][query]['label_channel'];
                    //         // parsed.start = this.average(subfeatures[query]);
                    //         if(parseInt(f.qstart) === parseInt(this.qcBareFeatures[f.query_contig_id][query]['position']))
                    //             parsed.start = f.start;
                    //         else
                    //             parsed.start = parseInt(this.qcBareFeatures[f.query_contig_id][query]['position']) + parseInt(f.start);
                    //          parsed.end = parsed.start + 7;
                    //         parsed.score = null;
                    //         parsed.phase = 0;
                    //         // parsed.strand = f[7];
                    //         parsed.strand = null;
                    //         parsed.attributes = {
                    //             "ID": [query]
                    //         };
                    //         sub.push(parsed);
                    //     }
                    //     if (sub.length)
                    //         // f.subfeatures = sub;
                    //     f.alignment = null;
                    // }
                    // return f;
                },

                average: function(positions) {
                    var sum = 0;
                    for (var i = 0; i < positions.length; i++) {
                        sum += positions[i];
                        //don't forget to add the base
                    }

                    return sum / positions.length;
                },

                /**
                 * Interrogate whether a store has data for a given reference
                 * sequence.  Calls the given callback with either true or false.
                 *
                 * Implemented as a binary interrogation because some stores are
                 * smart enough to regularize reference sequence names, while
                 * others are not.
                 */
                hasRefSeq: function(seqName, callback, errorCallback) {
                    var thisB = this;
                    this._deferred.features.then(function() {
                        callback(thisB.browser.regularizeReferenceName(seqName) in thisB.refSeqs);
                    });
                }

            });
    }
);
